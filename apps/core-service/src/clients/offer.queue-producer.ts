import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export interface OfferTimeoutPayload {
  offerId: string;
  deliveryId: string;
  attemptCount: number;
}

@Injectable()
export class OfferQueueProducer implements OnModuleDestroy {
  private readonly logger = new Logger(OfferQueueProducer.name);
  private queue: Queue;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    const url = new URL(redisUrl);

    this.queue = new Queue('offer', {
      connection: {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
      },
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
  }

  async scheduleTimeoutCheck(
    offerId: string,
    deliveryId: string,
    attemptCount: number,
    delayMs: number = 10000,
  ): Promise<void> {
    try {
      await this.queue.add(
        'check-timeout',
        { offerId, deliveryId, attemptCount } as OfferTimeoutPayload,
        {
          delay: delayMs,
          attempts: 1,
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      );
      this.logger.log(`Timeout check scheduled for offer ${offerId} in ${delayMs}ms`);
    } catch (error) {
      this.logger.error(`Failed to schedule timeout check: ${error.message}`);
    }
  }
}
