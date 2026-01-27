import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export interface NotificationPayload {
  type: 'OFFER_CREATED' | 'OFFER_ACCEPTED' | 'OFFER_REJECTED' | 'OFFER_EXPIRED' | 'DELIVERY_UPDATE';
  riderId?: string;
  storeId?: string;
  deliveryId?: string;
  offerId?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationQueueProducer implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueProducer.name);
  private queue: Queue;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    const url = new URL(redisUrl);

    this.queue = new Queue('notification', {
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

  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      await this.queue.add('send', payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      });
      this.logger.log(`Notification queued: ${payload.type} for rider ${payload.riderId}`);
    } catch (error) {
      this.logger.error(`Failed to queue notification: ${error.message}`);
    }
  }

  async sendOfferCreatedNotification(
    riderId: string,
    offerId: string,
    deliveryId: string,
  ): Promise<void> {
    await this.sendNotification({
      type: 'OFFER_CREATED',
      riderId,
      offerId,
      deliveryId,
      title: '새로운 배차 요청',
      body: '새로운 배달 요청이 있습니다. 10초 내에 수락해주세요.',
      data: { offerId, deliveryId },
    });
  }

  async sendOfferAcceptedNotification(
    storeId: string,
    deliveryId: string,
    riderId: string,
  ): Promise<void> {
    await this.sendNotification({
      type: 'OFFER_ACCEPTED',
      storeId,
      deliveryId,
      riderId,
      title: '배차 수락됨',
      body: '라이더가 배달을 수락했습니다.',
      data: { deliveryId, riderId },
    });
  }

  async sendOfferRejectedNotification(
    storeId: string,
    deliveryId: string,
  ): Promise<void> {
    await this.sendNotification({
      type: 'OFFER_REJECTED',
      storeId,
      deliveryId,
      title: '배차 거절됨',
      body: '라이더가 배달을 거절했습니다. 다른 라이더를 찾고 있습니다.',
      data: { deliveryId },
    });
  }
}
