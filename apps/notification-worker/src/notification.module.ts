import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PushProcessor } from './processors/push.processor';
import { SmsProcessor } from './processors/sms.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({
      name: 'notification',
    }),
  ],
  controllers: [],
  providers: [PushProcessor, SmsProcessor],
})
export class NotificationModule {}
