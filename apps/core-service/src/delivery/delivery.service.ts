import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery, DeliveryStatus } from '@app/database';
import { CreateDeliveryDto } from '@app/common';
import { StoreService } from '../store/store.service';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(Delivery)
    private deliveryRepository: Repository<Delivery>,
    private storeService: StoreService,
  ) {}

  async create(createDeliveryDto: CreateDeliveryDto): Promise<Delivery> {
    // Validate store exists
    await this.storeService.findOne(createDeliveryDto.storeId);

    const delivery = this.deliveryRepository.create(createDeliveryDto);
    return this.deliveryRepository.save(delivery);
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
