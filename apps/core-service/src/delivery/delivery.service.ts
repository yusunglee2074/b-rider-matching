import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery, DeliveryStatus } from '@app/database';
import { CreateDeliveryDto } from '@app/common';
import { StoreService } from '../store/store.service';
import { AutoDispatchService } from '../offer/auto-dispatch.service';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @InjectRepository(Delivery)
    private deliveryRepository: Repository<Delivery>,
    private storeService: StoreService,
    @Inject(forwardRef(() => AutoDispatchService))
    private autoDispatchService: AutoDispatchService,
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
    return this.updateStatus(id, DeliveryStatus.DELIVERED);
  }

  async setCancelled(id: string): Promise<Delivery> {
    return this.updateStatus(id, DeliveryStatus.CANCELLED);
  }
}
