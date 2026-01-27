import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

const RIDER_STATUS_PREFIX = 'rider:status:';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  async onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async geoadd(
    key: string,
    longitude: number,
    latitude: number,
    member: string,
  ): Promise<number> {
    return this.client.geoadd(key, longitude, latitude, member);
  }

  async georadius(
    key: string,
    longitude: number,
    latitude: number,
    radius: number,
    unit: 'km' | 'm',
    options?: { withCoord?: boolean; withDist?: boolean; count?: number },
  ): Promise<any[]> {
    const args: (string | number)[] = [key, longitude, latitude, radius, unit];

    if (options?.withCoord) args.push('WITHCOORD');
    if (options?.withDist) args.push('WITHDIST');
    if (options?.count) args.push('COUNT', options.count);

    return this.client.georadius(...(args as [string, number, number, number, 'km' | 'm']));
  }

  async geopos(key: string, member: string): Promise<[string, string] | null> {
    const result = await this.client.geopos(key, member);
    return result[0] as [string, string] | null;
  }

  async getRiderStatuses(riderIds: string[]): Promise<Map<string, string | null>> {
    if (riderIds.length === 0) {
      return new Map();
    }

    const keys = riderIds.map((id) => `${RIDER_STATUS_PREFIX}${id}`);
    const statuses = await this.client.mget(...keys);

    const result = new Map<string, string | null>();
    riderIds.forEach((id, index) => {
      result.set(id, statuses[index]);
    });

    return result;
  }
}
