import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer, OfferStatus, DeliveryStatus, RiderStatus } from '@app/database';
import { RedisLockService } from '@app/common';
import { CreateOfferDto, RespondOfferDto } from '@app/common';
import { RiderService } from '../rider/rider.service';
import { DeliveryService } from '../delivery/delivery.service';
import { LocationGrpcClient } from '../clients/location.grpc-client';
import { NotificationQueueProducer } from '../clients/notification.queue-producer';
import { OfferQueueProducer } from '../clients/offer.queue-producer';
import { AutoDispatchService } from './auto-dispatch.service';

const OFFER_EXPIRY_SECONDS = 10;
const MAX_DISPATCH_ATTEMPTS = 5;

@Injectable()
export class OfferService {
  private readonly logger = new Logger(OfferService.name);

  constructor(
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
    private riderService: RiderService,
    private deliveryService: DeliveryService,
    private redisLockService: RedisLockService,
    private locationClient: LocationGrpcClient,
    private notificationProducer: NotificationQueueProducer,
    private offerQueueProducer: OfferQueueProducer,
    @Inject(forwardRef(() => AutoDispatchService))
    private autoDispatchService: AutoDispatchService,
  ) {}

  async create(createOfferDto: CreateOfferDto): Promise<Offer> {
    const { deliveryId, riderId } = createOfferDto;

    // Validate delivery exists and is pending
    const delivery = await this.deliveryService.findOne(deliveryId);
    if (delivery.status !== DeliveryStatus.PENDING) {
      throw new BadRequestException('Delivery is not in PENDING status');
    }

    // Validate rider exists and is available
    const rider = await this.riderService.findOne(riderId);
    if (rider.status !== RiderStatus.AVAILABLE) {
      throw new BadRequestException('Rider is not available');
    }

    // Check for existing pending offer for this delivery
    const existingOffer = await this.offerRepository.findOne({
      where: { deliveryId, status: OfferStatus.PENDING },
    });
    if (existingOffer) {
      throw new ConflictException('Delivery already has a pending offer');
    }

    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_SECONDS * 1000);

    const offer = this.offerRepository.create({
      deliveryId,
      riderId,
      expiresAt,
    });

    const savedOffer = await this.offerRepository.save(offer);

    // Schedule timeout check
    await this.offerQueueProducer.scheduleTimeoutCheck(
      savedOffer.id,
      deliveryId,
      savedOffer.attemptCount || 1,
      OFFER_EXPIRY_SECONDS * 1000,
    );

    // Send notification to rider
    await this.notificationProducer.sendOfferCreatedNotification(
      riderId,
      savedOffer.id,
      deliveryId,
    );

    return savedOffer;
  }

  async findAll(): Promise<Offer[]> {
    return this.offerRepository.find({
      relations: ['delivery', 'rider'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Offer> {
    const offer = await this.offerRepository.findOne({
      where: { id },
      relations: ['delivery', 'rider'],
    });
    if (!offer) {
      throw new NotFoundException(`Offer with ID ${id} not found`);
    }
    return offer;
  }

  async findPendingByRider(riderId: string): Promise<Offer[]> {
    return this.offerRepository.find({
      where: { riderId, status: OfferStatus.PENDING },
      relations: ['delivery'],
      order: { createdAt: 'DESC' },
    });
  }

  async respond(id: string, respondDto: RespondOfferDto): Promise<Offer> {
    // Acquire distributed lock to prevent race conditions
    const lock = await this.redisLockService.acquire(`offer:${id}`);
    if (!lock) {
      throw new ConflictException('Offer is being processed');
    }

    try {
      const offer = await this.findOne(id);

      // Check if offer is still pending
      if (offer.status !== OfferStatus.PENDING) {
        throw new BadRequestException(`Offer is already ${offer.status}`);
      }

      // Check if offer has expired
      if (new Date() > offer.expiresAt) {
        offer.status = OfferStatus.EXPIRED;
        await this.offerRepository.save(offer);
        throw new BadRequestException('Offer has expired');
      }

      offer.status = respondDto.status;
      offer.respondedAt = new Date();

      if (respondDto.status === OfferStatus.ACCEPTED) {
        // Update delivery status to ASSIGNED
        await this.deliveryService.setAssigned(offer.deliveryId);
        // Update rider status to BUSY
        await this.riderService.setBusy(offer.riderId);
        // Notify store
        await this.notificationProducer.sendOfferAcceptedNotification(
          offer.delivery.storeId,
          offer.deliveryId,
          offer.riderId,
        );
      } else if (respondDto.status === OfferStatus.REJECTED) {
        // Notify store
        await this.notificationProducer.sendOfferRejectedNotification(
          offer.delivery.storeId,
          offer.deliveryId,
        );

        // Trigger re-dispatch to next rider
        const savedOffer = await this.offerRepository.save(offer);
        await this.triggerRedispatch(offer.deliveryId, offer.attemptCount || 1);
        return savedOffer;
      }

      return this.offerRepository.save(offer);
    } finally {
      await lock.release();
    }
  }

  private async triggerRedispatch(
    deliveryId: string,
    currentAttemptCount: number,
  ): Promise<void> {
    if (currentAttemptCount >= MAX_DISPATCH_ATTEMPTS) {
      this.logger.warn(
        `Delivery ${deliveryId} reached max dispatch attempts (${MAX_DISPATCH_ATTEMPTS})`,
      );
      return;
    }

    try {
      const previousOffers = await this.offerRepository.find({
        where: { deliveryId },
        select: ['riderId'],
      });
      const excludeRiderIds = previousOffers.map((o) => o.riderId);

      const result = await this.autoDispatchService.dispatchToNextRider(
        deliveryId,
        excludeRiderIds,
      );

      if (result.success && result.offerId) {
        await this.offerRepository.update(result.offerId, {
          attemptCount: currentAttemptCount + 1,
        });

        await this.offerQueueProducer.scheduleTimeoutCheck(
          result.offerId,
          deliveryId,
          currentAttemptCount + 1,
        );

        this.logger.log(
          `Re-dispatched delivery ${deliveryId} after rejection, attempt ${currentAttemptCount + 1}`,
        );
      } else {
        this.logger.warn(`Failed to re-dispatch delivery ${deliveryId}: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Error during re-dispatch for delivery ${deliveryId}: ${error.message}`);
    }
  }

  async accept(id: string): Promise<Offer> {
    return this.respond(id, { status: OfferStatus.ACCEPTED });
  }

  async reject(id: string): Promise<Offer> {
    return this.respond(id, { status: OfferStatus.REJECTED });
  }

  async findNearbyRidersForDelivery(deliveryId: string): Promise<any[]> {
    const delivery = await this.deliveryService.findOne(deliveryId);
    return this.locationClient.getNearbyRiders(
      Number(delivery.pickupLatitude),
      Number(delivery.pickupLongitude),
      5,
      10,
    );
  }

  async expireOldOffers(): Promise<number> {
    const result = await this.offerRepository
      .createQueryBuilder()
      .update(Offer)
      .set({ status: OfferStatus.EXPIRED })
      .where('status = :status', { status: OfferStatus.PENDING })
      .andWhere('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }
}
