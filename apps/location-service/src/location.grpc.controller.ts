import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { LocationService } from './location.service';

interface UpdateLocationRequest {
  rider_id: string;
  latitude: number;
  longitude: number;
}

interface GetNearbyRidersRequest {
  latitude: number;
  longitude: number;
  radius_km: number;
  limit: number;
}

interface GetRiderLocationRequest {
  rider_id: string;
}

@Controller()
export class LocationGrpcController {
  constructor(private readonly locationService: LocationService) {}

  @GrpcMethod('LocationService', 'UpdateLocation')
  async updateLocation(data: UpdateLocationRequest) {
    const success = await this.locationService.updateLocation(
      data.rider_id,
      data.latitude,
      data.longitude,
    );
    return { success };
  }

  @GrpcMethod('LocationService', 'GetNearbyRiders')
  async getNearbyRiders(data: GetNearbyRidersRequest) {
    const riders = await this.locationService.getNearbyRiders(
      data.latitude,
      data.longitude,
      data.radius_km,
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

  @GrpcMethod('LocationService', 'GetRiderLocation')
  async getRiderLocation(data: GetRiderLocationRequest) {
    const location = await this.locationService.getRiderLocation(data.rider_id);

    if (!location) {
      return {
        rider_id: data.rider_id,
        latitude: 0,
        longitude: 0,
        updated_at: 0,
      };
    }

    return {
      rider_id: location.riderId,
      latitude: location.latitude,
      longitude: location.longitude,
      updated_at: Date.now(),
    };
  }
}
