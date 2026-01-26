import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationJobData } from '../interfaces/notification-job.interface';

@Processor('notification')
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    if (job.name !== 'sms') {
      return;
    }

    const { riderId, type, payload } = job.data;

    this.logger.log(`Processing SMS for rider ${riderId}`);

    const message = this.buildSmsMessage(type, payload);

    // TODO: SMS Provider 실제 연동
    await this.sendSms(riderId, message);

    this.logger.log(`SMS sent to rider ${riderId}`);
  }

  private buildSmsMessage(
    type: string,
    payload: Record<string, any>,
  ): string {
    switch (type) {
      case 'OFFER_ASSIGNED':
        return `[B-Rider] ${payload.storeName}에서 새로운 배차 요청이 도착했습니다.`;
      case 'OFFER_TIMEOUT':
        return `[B-Rider] 배차 요청 응답 시간이 초과되었습니다.`;
      case 'DELIVERY_COMPLETED':
        return `[B-Rider] 배달이 완료되었습니다.`;
      default:
        return `[B-Rider] 새로운 알림이 있습니다.`;
    }
  }

  private async sendSms(riderId: string, message: string): Promise<void> {
    // Mock SMS 발송
    this.logger.debug(`[Mock SMS] riderId: ${riderId}, message: ${message}`);
  }
}
