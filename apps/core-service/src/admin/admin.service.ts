import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer, OfferStatus, Delivery, DeliveryStatus, Rider, RiderStatus } from '@app/database';
import { RedisLockService } from '@app/common';
import { RiderService } from '../rider/rider.service';
import { DeliveryService } from '../delivery/delivery.service';
import { NotificationQueueProducer } from '../clients/notification.queue-producer';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
    @InjectRepository(Delivery)
    private deliveryRepository: Repository<Delivery>,
    @InjectRepository(Rider)
    private riderRepository: Repository<Rider>,
    private riderService: RiderService,
    private deliveryService: DeliveryService,
    private redisLockService: RedisLockService,
    private notificationProducer: NotificationQueueProducer,
  ) {}

  async assignDelivery(
    deliveryId: string,
    riderId: string,
    reason?: string,
  ): Promise<{ offer: Offer; message: string }> {
    this.logger.log(`Admin assigning delivery ${deliveryId} to rider ${riderId}. Reason: ${reason || 'N/A'}`);

    // Validate delivery exists and is pending
    const delivery = await this.deliveryService.findOne(deliveryId);
    if (delivery.status !== DeliveryStatus.PENDING) {
      throw new BadRequestException(`Delivery is not in PENDING status. Current status: ${delivery.status}`);
    }

    // Validate rider exists and is available
    const rider = await this.riderService.findOne(riderId);
    if (rider.status !== RiderStatus.AVAILABLE) {
      throw new BadRequestException(`Rider is not available. Current status: ${rider.status}`);
    }

    // Cancel any existing pending offers for this delivery
    await this.cancelPendingOffersForDelivery(deliveryId);

    // Create new offer without timeout (admin manual dispatch)
    const offer = this.offerRepository.create({
      deliveryId,
      riderId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year (effectively no timeout)
    });

    const savedOffer = await this.offerRepository.save(offer);

    // Send notification to rider
    await this.notificationProducer.sendOfferCreatedNotification(
      riderId,
      savedOffer.id,
      deliveryId,
    );

    this.logger.log(`Admin created offer ${savedOffer.id} for delivery ${deliveryId}`);

    return {
      offer: savedOffer,
      message: `Delivery ${deliveryId} assigned to rider ${riderId}`,
    };
  }

  async reassignDelivery(
    deliveryId: string,
    newRiderId: string,
    reason?: string,
  ): Promise<{ cancelledOffer: Offer; newOffer: Offer; message: string }> {
    this.logger.log(`Admin reassigning delivery ${deliveryId} to rider ${newRiderId}. Reason: ${reason || 'N/A'}`);

    const delivery = await this.deliveryService.findOne(deliveryId);

    // Find current accepted offer
    const currentOffer = await this.offerRepository.findOne({
      where: { deliveryId, status: OfferStatus.ACCEPTED },
    });

    if (!currentOffer) {
      throw new BadRequestException('No accepted offer found for this delivery');
    }

    // Validate new rider exists and is available
    const newRider = await this.riderService.findOne(newRiderId);
    if (newRider.status !== RiderStatus.AVAILABLE) {
      throw new BadRequestException(`New rider is not available. Current status: ${newRider.status}`);
    }

    // Acquire lock for the current offer
    const lock = await this.redisLockService.acquire(`offer:${currentOffer.id}`);
    if (!lock) {
      throw new BadRequestException('Offer is being processed');
    }

    try {
      // Cancel current offer
      currentOffer.status = OfferStatus.CANCELLED_BY_ADMIN;
      const cancelledOffer = await this.offerRepository.save(currentOffer);

      // Set previous rider back to available
      await this.riderService.setAvailable(currentOffer.riderId);

      // Reset delivery status to pending
      await this.deliveryService.updateStatus(deliveryId, DeliveryStatus.PENDING);

      // Create new offer for new rider
      const newOffer = this.offerRepository.create({
        deliveryId,
        riderId: newRiderId,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year (effectively no timeout)
      });

      const savedNewOffer = await this.offerRepository.save(newOffer);

      // Send notifications
      await this.notificationProducer.sendNotification({
        type: 'DELIVERY_UPDATE',
        riderId: currentOffer.riderId,
        deliveryId,
        title: '배차 취소',
        body: '관리자에 의해 배차가 취소되었습니다.',
        data: { deliveryId },
      });

      await this.notificationProducer.sendOfferCreatedNotification(
        newRiderId,
        savedNewOffer.id,
        deliveryId,
      );

      this.logger.log(`Admin reassigned delivery ${deliveryId}: cancelled offer ${cancelledOffer.id}, created offer ${savedNewOffer.id}`);

      return {
        cancelledOffer,
        newOffer: savedNewOffer,
        message: `Delivery ${deliveryId} reassigned from rider ${currentOffer.riderId} to rider ${newRiderId}`,
      };
    } finally {
      await lock.release();
    }
  }

  async cancelOffer(
    offerId: string,
    reason?: string,
  ): Promise<{ offer: Offer; message: string }> {
    this.logger.log(`Admin cancelling offer ${offerId}. Reason: ${reason || 'N/A'}`);

    const offer = await this.offerRepository.findOne({
      where: { id: offerId },
      relations: ['delivery', 'rider'],
    });

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${offerId} not found`);
    }

    if (offer.status !== OfferStatus.PENDING && offer.status !== OfferStatus.ACCEPTED) {
      throw new BadRequestException(`Cannot cancel offer with status ${offer.status}`);
    }

    const lock = await this.redisLockService.acquire(`offer:${offerId}`);
    if (!lock) {
      throw new BadRequestException('Offer is being processed');
    }

    try {
      const wasAccepted = offer.status === OfferStatus.ACCEPTED;

      offer.status = OfferStatus.CANCELLED_BY_ADMIN;
      const cancelledOffer = await this.offerRepository.save(offer);

      // If offer was accepted, reset delivery and rider status
      if (wasAccepted) {
        await this.deliveryService.updateStatus(offer.deliveryId, DeliveryStatus.PENDING);
        await this.riderService.setAvailable(offer.riderId);
      }

      // Notify rider
      await this.notificationProducer.sendNotification({
        type: 'DELIVERY_UPDATE',
        riderId: offer.riderId,
        deliveryId: offer.deliveryId,
        offerId,
        title: '배차 취소',
        body: '관리자에 의해 배차가 취소되었습니다.',
        data: { offerId, deliveryId: offer.deliveryId },
      });

      this.logger.log(`Admin cancelled offer ${offerId}`);

      return {
        offer: cancelledOffer,
        message: `Offer ${offerId} cancelled by admin`,
      };
    } finally {
      await lock.release();
    }
  }

  async getDashboard(): Promise<{
    activeDeliveries: number;
    pendingDeliveries: number;
    availableRiders: number;
    pendingOffers: number;
  }> {
    const [activeDeliveries, pendingDeliveries, availableRiders, pendingOffers] =
      await Promise.all([
        this.deliveryRepository.count({
          where: { status: DeliveryStatus.ASSIGNED },
        }),
        this.deliveryRepository.count({
          where: { status: DeliveryStatus.PENDING },
        }),
        this.riderRepository.count({
          where: { status: RiderStatus.AVAILABLE },
        }),
        this.offerRepository.count({
          where: { status: OfferStatus.PENDING },
        }),
      ]);

    return {
      activeDeliveries,
      pendingDeliveries,
      availableRiders,
      pendingOffers,
    };
  }

  private async cancelPendingOffersForDelivery(deliveryId: string): Promise<void> {
    const pendingOffers = await this.offerRepository.find({
      where: { deliveryId, status: OfferStatus.PENDING },
    });

    for (const offer of pendingOffers) {
      offer.status = OfferStatus.CANCELLED_BY_ADMIN;
      await this.offerRepository.save(offer);
      this.logger.log(`Cancelled pending offer ${offer.id} for delivery ${deliveryId}`);
    }
  }
}
