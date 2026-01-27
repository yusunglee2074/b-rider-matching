import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rider } from '@app/database';
import { RiderStatusService } from '@app/common';
import { RiderController } from './rider.controller';
import { RiderService } from './rider.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rider])],
  controllers: [RiderController],
  providers: [RiderService, RiderStatusService],
  exports: [RiderService],
})
export class RiderModule {}
