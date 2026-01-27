import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from '@app/database';
import { RedisLockService } from '@app/common';
import { OfferController } from './offer.controller';
import { OfferService } from './offer.service';
import { AutoDispatchService } from './auto-dispatch.service';
import { OfferTimeoutProcessor } from './offer-timeout.processor';
import { RiderModule } from '../rider/rider.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { LocationGrpcClient } from '../clients/location.grpc-client';
import { NotificationQueueProducer } from '../clients/notification.queue-producer';
import { OfferQueueProducer } from '../clients/offer.queue-producer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer]),
    RiderModule,
    forwardRef(() => DeliveryModule),
  ],
  controllers: [OfferController],
  providers: [
    OfferService,
    AutoDispatchService,
    OfferTimeoutProcessor,
    RedisLockService,
    LocationGrpcClient,
    NotificationQueueProducer,
    OfferQueueProducer,
  ],
  exports: [OfferService, AutoDispatchService],
})
export class OfferModule {}
