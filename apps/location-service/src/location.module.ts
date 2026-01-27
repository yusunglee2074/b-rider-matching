import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationGrpcController } from './location.grpc.controller';
import { LocationService } from './location.service';
import { RedisModule } from './redis';

@Module({
  imports: [RedisModule],
  controllers: [LocationController, LocationGrpcController],
  providers: [LocationService],
})
export class LocationModule {}
