import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { RedisLockService } from '@app/common';
import { StoreModule } from './store/store.module';
import { RiderModule } from './rider/rider.module';
import { DeliveryModule } from './delivery/delivery.module';
import { OfferModule } from './offer/offer.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    StoreModule,
    RiderModule,
    DeliveryModule,
    OfferModule,
    AdminModule,
  ],
  controllers: [],
  providers: [RedisLockService],
  exports: [RedisLockService],
})
export class AppModule {}
