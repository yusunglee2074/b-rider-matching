import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { LocationService } from './location.service';

interface UpdateRiderLocationRequest {
  rider_id?: string;
  riderId?: string;
  latitude: number;
  longitude: number;
}

interface GetNearbyRidersRequest {
  latitude: number;
  longitude: number;
  radius_km?: number;
  radiusKm?: number;
  limit: number;
}

@Controller()
export class LocationGrpcController {
  constructor(private readonly locationService: LocationService) {}

  @GrpcMethod('LocationService', 'UpdateRiderLocation')
  async updateRiderLocation(data: UpdateRiderLocationRequest) {
    const riderId = data.rider_id || data.riderId || '';
    const success = await this.locationService.updateLocation(
      riderId,
      data.latitude,
      data.longitude,
    );
    return { success };
  }

  @GrpcMethod('LocationService', 'GetNearbyRiders')
  async getNearbyRiders(data: GetNearbyRidersRequest) {
    const radiusKm = data.radius_km || data.radiusKm || 5;
    const riders = await this.locationService.getNearbyRiders(
      data.latitude,
      data.longitude,
      radiusKm,
      data.limit || 10,
    );

    return {
      riders: riders.map((r) => ({
        rider_id: r.riderId,
        latitude: r.latitude,
        longitude: r.longitude,
        distance_km: r.distanceKm,
      })),
    };
  }
}
