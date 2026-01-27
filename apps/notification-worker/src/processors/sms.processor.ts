import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationJobData } from '../interfaces/notification-job.interface';

@Processor('notification')
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    // SMS jobs use 'sms' job name (for future use)
    if (job.name !== 'sms') {
      return;
    }

    const { riderId, storeId, title, body, type } = job.data;
    const targetId = riderId || storeId;

    if (!targetId) {
      this.logger.warn(`No target ID for SMS notification type ${type}`);
      return;
    }

    this.logger.log(`Processing SMS: ${type} for ${targetId}`);

    const message = `[B-Rider] ${body}`;

    // TODO: SMS Provider 실제 연동
    await this.sendSms(targetId, message);

    this.logger.log(`SMS sent: ${type} to ${targetId}`);
  }

  private async sendSms(targetId: string, message: string): Promise<void> {
    // Mock SMS 발송
    this.logger.debug(`[Mock SMS] targetId: ${targetId}, message: ${message}`);
  }
}
