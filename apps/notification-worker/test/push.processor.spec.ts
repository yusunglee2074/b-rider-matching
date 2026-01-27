import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { PushProcessor } from '../src/processors/push.processor';
import { NotificationJobData } from '../src/interfaces/notification-job.interface';

describe('PushProcessor', () => {
  let processor: PushProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PushProcessor],
    }).compile();

    processor = module.get<PushProcessor>(PushProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process OFFER_ASSIGNED push notification', async () => {
    const jobData: NotificationJobData = {
      type: 'OFFER_ASSIGNED',
      riderId: 'rider-123',
      payload: { storeName: '맛있는 치킨' },
    };

    const mockJob = {
      name: 'push',
      data: jobData,
    } as Job<NotificationJobData>;

    await expect(processor.process(mockJob)).resolves.not.toThrow();
  });

  it('should skip non-push jobs', async () => {
    const jobData: NotificationJobData = {
      type: 'OFFER_ASSIGNED',
      riderId: 'rider-123',
      payload: {},
    };

    const mockJob = {
      name: 'sms',
      data: jobData,
    } as Job<NotificationJobData>;

    await expect(processor.process(mockJob)).resolves.not.toThrow();
  });
});
