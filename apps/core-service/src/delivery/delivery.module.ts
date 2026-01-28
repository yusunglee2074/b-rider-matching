import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery, Offer } from '@app/database';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { StoreModule } from '../store/store.module';
import { OfferModule } from '../offer/offer.module';
import { RiderModule } from '../rider/rider.module';
import { LocationGrpcClient } from '../clients/location.grpc-client';

@Module({
  imports: [
    TypeOrmModule.forFeature([Delivery, Offer]),
    StoreModule,
    forwardRef(() => OfferModule),
    forwardRef(() => RiderModule),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService, LocationGrpcClient],
  exports: [DeliveryService],
})
export class DeliveryModule {}
