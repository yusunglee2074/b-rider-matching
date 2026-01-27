import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationJobData } from '../interfaces/notification-job.interface';

@Processor('notification')
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    // Handle 'send' job name from producer
    if (job.name !== 'send') {
      return;
    }

    const { riderId, storeId, title, body, type } = job.data;
    const targetId = riderId || storeId;

    if (!targetId) {
      this.logger.warn(`No target ID for notification type ${type}`);
      return;
    }

    this.logger.log(`Processing push notification: ${type} for ${targetId}`);

    // TODO: FCM 실제 연동
    await this.sendFcm(targetId, { title, body });

    this.logger.log(`Push notification sent: ${type} to ${targetId}`);
  }

  private async sendFcm(
    targetId: string,
    message: { title: string; body: string },
  ): Promise<void> {
    // Mock FCM 발송
    this.logger.debug(
      `[Mock FCM] targetId: ${targetId}, title: ${message.title}, body: ${message.body}`,
    );
  }
}
