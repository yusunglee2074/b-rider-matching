import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface Lock {
  release: () => Promise<void>;
}

@Injectable()
export class RedisLockService implements OnModuleDestroy {
  private redis: Redis;
  private readonly defaultTtl = 10000; // 10 seconds

  constructor(private configService: ConfigService) {
    this.redis = new Redis(this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379');
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async acquire(key: string, ttl: number = this.defaultTtl): Promise<Lock | null> {
    const lockKey = `lock:${key}`;
    const lockValue = uuidv4();

    const result = await this.redis.set(lockKey, lockValue, 'PX', ttl, 'NX');

    if (result !== 'OK') {
      return null;
    }

    return {
      release: async () => {
        // Use Lua script for atomic check-and-delete
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        await this.redis.eval(script, 1, lockKey, lockValue);
      },
    };
  }

  async isLocked(key: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const result = await this.redis.exists(lockKey);
    return result === 1;
  }
}
