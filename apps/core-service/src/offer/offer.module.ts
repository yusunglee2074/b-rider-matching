import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from '@app/database';
import { OfferController } from './offer.controller';
import { OfferService } from './offer.service';
import { RiderModule } from '../rider/rider.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { LocationGrpcClient } from '../clients/location.grpc-client';
import { NotificationQueueProducer } from '../clients/notification.queue-producer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer]),
    RiderModule,
    DeliveryModule,
  ],
  controllers: [OfferController],
  providers: [OfferService, LocationGrpcClient, NotificationQueueProducer],
  exports: [OfferService],
})
export class OfferModule {}
