import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  NotificationJobData,
  NotificationType,
} from '../interfaces/notification-job.interface';

@Processor('notification')
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    if (job.name !== 'push') {
      return;
    }

    const { riderId, type, payload } = job.data;

    this.logger.log(`Processing push notification for rider ${riderId}`);

    const message = this.buildMessage(type, payload);

    // TODO: FCM 실제 연동
    await this.sendFcm(riderId, message);

    this.logger.log(`Push notification sent to rider ${riderId}`);
  }

  private buildMessage(
    type: NotificationType,
    payload: Record<string, any>,
  ): { title: string; body: string } {
    switch (type) {
      case 'OFFER_ASSIGNED':
        return {
          title: '새로운 배차 요청',
          body: `${payload.storeName}에서 배차 요청이 도착했습니다.`,
        };
      case 'OFFER_TIMEOUT':
        return {
          title: '배차 시간 초과',
          body: '배차 요청 응답 시간이 초과되었습니다.',
        };
      case 'DELIVERY_COMPLETED':
        return {
          title: '배달 완료',
          body: `배달이 완료되었습니다. 수고하셨습니다!`,
        };
      default:
        return {
          title: '알림',
          body: '새로운 알림이 있습니다.',
        };
    }
  }

  private async sendFcm(
    riderId: string,
    message: { title: string; body: string },
  ): Promise<void> {
    // Mock FCM 발송
    this.logger.debug(
      `[Mock FCM] riderId: ${riderId}, title: ${message.title}, body: ${message.body}`,
    );
  }
}
