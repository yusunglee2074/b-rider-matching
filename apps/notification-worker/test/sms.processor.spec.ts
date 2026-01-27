import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { SmsProcessor } from '../src/processors/sms.processor';
import { NotificationJobData } from '../src/interfaces/notification-job.interface';

describe('SmsProcessor', () => {
  let processor: SmsProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsProcessor],
    }).compile();

    processor = module.get<SmsProcessor>(SmsProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process OFFER_ASSIGNED sms notification', async () => {
    const jobData: NotificationJobData = {
      type: 'OFFER_ASSIGNED',
      riderId: 'rider-123',
      payload: { storeName: '맛있는 치킨' },
    };

    const mockJob = {
      name: 'sms',
      data: jobData,
    } as Job<NotificationJobData>;

    await expect(processor.process(mockJob)).resolves.not.toThrow();
  });

  it('should skip non-sms jobs', async () => {
    const jobData: NotificationJobData = {
      type: 'OFFER_ASSIGNED',
      riderId: 'rider-123',
      payload: {},
    };

    const mockJob = {
      name: 'push',
      data: jobData,
    } as Job<NotificationJobData>;

    await expect(processor.process(mockJob)).resolves.not.toThrow();
  });
});
