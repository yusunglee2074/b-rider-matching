import { Injectable, NotFoundException, Inject, forwardRef, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery, DeliveryStatus, Offer, OfferStatus } from '@app/database';
import { CreateDeliveryDto } from '@app/common';
import { StoreService } from '../store/store.service';
import { AutoDispatchService } from '../offer/auto-dispatch.service';
import { RiderService } from '../rider/rider.service';
import { LocationGrpcClient } from '../clients/location.grpc-client';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @InjectRepository(Delivery)
    private deliveryRepository: Repository<Delivery>,
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
    private storeService: StoreService,
    @Inject(forwardRef(() => AutoDispatchService))
    private autoDispatchService: AutoDispatchService,
    @Inject(forwardRef(() => RiderService))
    private riderService: RiderService,
    private locationClient: LocationGrpcClient,
  ) {}

  async create(createDeliveryDto: CreateDeliveryDto): Promise<Delivery> {
    // Validate store exists
    await this.storeService.findOne(createDeliveryDto.storeId);

    const delivery = this.deliveryRepository.create(createDeliveryDto);
    const savedDelivery = await this.deliveryRepository.save(delivery);

    // Trigger auto-dispatch (non-blocking, errors don't affect delivery creation)
    try {
      const result = await this.autoDispatchService.dispatch(savedDelivery.id);
      if (result.success) {
        this.logger.log(`Auto-dispatch successful for delivery ${savedDelivery.id}`);
      } else {
        this.logger.warn(`Auto-dispatch failed for delivery ${savedDelivery.id}: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Auto-dispatch error for delivery ${savedDelivery.id}: ${error.message}`);
    }

    return savedDelivery;
  }

  async findAll(): Promise<Delivery[]> {
    return this.deliveryRepository.find({
      relations: ['store'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id },
      relations: ['store'],
    });
    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }
    return delivery;
  }

  async findPending(): Promise<Delivery[]> {
    return this.deliveryRepository.find({
      where: { status: DeliveryStatus.PENDING },
      relations: ['store'],
      order: { createdAt: 'ASC' },
    });
  }

  async updateStatus(id: string, status: DeliveryStatus): Promise<Delivery> {
    const delivery = await this.findOne(id);
    delivery.status = status;
    return this.deliveryRepository.save(delivery);
  }

  async setAssigned(id: string): Promise<Delivery> {
    return this.updateStatus(id, DeliveryStatus.ASSIGNED);
  }

  async setPickedUp(id: string): Promise<Delivery> {
    return this.updateStatus(id, DeliveryStatus.PICKED_UP);
  }

  async setDelivered(id: string): Promise<Delivery> {
    const delivery = await this.findOne(id);

    // Find the accepted offer to get the rider
    const acceptedOffer = await this.offerRepository.findOne({
      where: {
        deliveryId: id,
        status: OfferStatus.ACCEPTED,
      },
    });

    // Set rider back to AVAILABLE and update location to dropoff point
    if (acceptedOffer) {
      await this.riderService.setAvailable(acceptedOffer.riderId);

      // Update rider location to dropoff coordinates
      await this.locationClient.updateRiderLocation(
        acceptedOffer.riderId,
        Number(delivery.dropoffLatitude),
        Number(delivery.dropoffLongitude),
      );
    }

    return this.updateStatus(id, DeliveryStatus.DELIVERED);
  }

  async setCancelled(id: string): Promise<Delivery> {
    return this.updateStatus(id, DeliveryStatus.CANCELLED);
  }

  async cancelByRider(id: string, riderId: string): Promise<Delivery> {
    const delivery = await this.findOne(id);

    // Only ASSIGNED status can be cancelled by rider (before pickup)
    if (delivery.status !== DeliveryStatus.ASSIGNED) {
      throw new BadRequestException(
        `Cannot cancel delivery in ${delivery.status} status. Only ASSIGNED deliveries can be cancelled.`,
      );
    }

    // Verify the rider has an accepted offer for this delivery
    const acceptedOffer = await this.offerRepository.findOne({
      where: {
        deliveryId: id,
        riderId,
        status: OfferStatus.ACCEPTED,
      },
    });

    if (!acceptedOffer) {
      throw new BadRequestException('You do not have an accepted offer for this delivery');
    }

    // Cancel the offer
    acceptedOffer.status = OfferStatus.REJECTED;
    await this.offerRepository.save(acceptedOffer);

    // Set rider back to AVAILABLE
    await this.riderService.setAvailable(riderId);

    // Set delivery back to PENDING for re-dispatch
    delivery.status = DeliveryStatus.PENDING;
    const savedDelivery = await this.deliveryRepository.save(delivery);

    // Trigger re-dispatch
    try {
      const result = await this.autoDispatchService.dispatch(id);
      if (result.success) {
        this.logger.log(`Re-dispatch after rider cancellation successful for delivery ${id}`);
      } else {
        this.logger.warn(`Re-dispatch after rider cancellation failed for delivery ${id}: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Re-dispatch error after rider cancellation for delivery ${id}: ${error.message}`);
    }

    return savedDelivery;
  }
}
