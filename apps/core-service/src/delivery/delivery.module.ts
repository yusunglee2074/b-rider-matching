import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from '@app/database';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { StoreModule } from '../store/store.module';
import { OfferModule } from '../offer/offer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Delivery]),
    StoreModule,
    forwardRef(() => OfferModule),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
