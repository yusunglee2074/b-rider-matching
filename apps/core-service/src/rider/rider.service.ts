import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rider, RiderStatus } from '@app/database';
import { CreateRiderDto, UpdateRiderDto, UpdateRiderStatusDto } from '@app/common';

@Injectable()
export class RiderService {
  constructor(
    @InjectRepository(Rider)
    private riderRepository: Repository<Rider>,
  ) {}

  async create(createRiderDto: CreateRiderDto): Promise<Rider> {
    const existing = await this.riderRepository.findOne({
      where: { phone: createRiderDto.phone },
    });
    if (existing) {
      throw new ConflictException('Rider with this phone already exists');
    }

    const rider = this.riderRepository.create(createRiderDto);
    return this.riderRepository.save(rider);
  }

  async findAll(): Promise<Rider[]> {
    return this.riderRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Rider> {
    const rider = await this.riderRepository.findOne({ where: { id } });
    if (!rider) {
      throw new NotFoundException(`Rider with ID ${id} not found`);
    }
    return rider;
  }

  async findAvailable(): Promise<Rider[]> {
    return this.riderRepository.find({
      where: { status: RiderStatus.AVAILABLE },
    });
  }

  async update(id: string, updateRiderDto: UpdateRiderDto): Promise<Rider> {
    const rider = await this.findOne(id);
    Object.assign(rider, updateRiderDto);
    return this.riderRepository.save(rider);
  }

  async updateStatus(id: string, updateStatusDto: UpdateRiderStatusDto): Promise<Rider> {
    const rider = await this.findOne(id);
    rider.status = updateStatusDto.status;
    return this.riderRepository.save(rider);
  }

  async setAvailable(id: string): Promise<Rider> {
    return this.updateStatus(id, { status: RiderStatus.AVAILABLE });
  }

  async setBusy(id: string): Promise<Rider> {
    return this.updateStatus(id, { status: RiderStatus.BUSY });
  }

  async setOffline(id: string): Promise<Rider> {
    return this.updateStatus(id, { status: RiderStatus.OFFLINE });
  }
}
