import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { Store, Rider, Delivery, Offer } from '@app/database';
import { RiderModule } from '../rider/rider.module';
import { StoreModule } from '../store/store.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { OfferModule } from '../offer/offer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, Rider, Delivery, Offer]),
    RiderModule,
    StoreModule,
    DeliveryModule,
    OfferModule,
  ],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
