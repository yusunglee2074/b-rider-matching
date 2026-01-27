import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer, Delivery, Rider } from '@app/database';
import { RedisLockService } from '@app/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { RiderModule } from '../rider/rider.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { NotificationQueueProducer } from '../clients/notification.queue-producer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer, Delivery, Rider]),
    RiderModule,
    DeliveryModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminGuard,
    RedisLockService,
    NotificationQueueProducer,
  ],
})
export class AdminModule {}
