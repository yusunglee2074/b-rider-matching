import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export enum RiderStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}

const RIDER_STATUS_PREFIX = 'rider:status:';

@Injectable()
export class RiderStatusService implements OnModuleDestroy {
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis(
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
    );
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async setStatus(riderId: string, status: RiderStatus): Promise<void> {
    await this.redis.set(`${RIDER_STATUS_PREFIX}${riderId}`, status);
  }

  async getStatus(riderId: string): Promise<RiderStatus | null> {
    const status = await this.redis.get(`${RIDER_STATUS_PREFIX}${riderId}`);
    return status as RiderStatus | null;
  }

  async getStatuses(riderIds: string[]): Promise<Map<string, RiderStatus | null>> {
    if (riderIds.length === 0) {
      return new Map();
    }

    const keys = riderIds.map((id) => `${RIDER_STATUS_PREFIX}${id}`);
    const statuses = await this.redis.mget(...keys);

    const result = new Map<string, RiderStatus | null>();
    riderIds.forEach((id, index) => {
      result.set(id, statuses[index] as RiderStatus | null);
    });

    return result;
  }

  async deleteStatus(riderId: string): Promise<void> {
    await this.redis.del(`${RIDER_STATUS_PREFIX}${riderId}`);
  }
}
