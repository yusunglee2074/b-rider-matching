import { Injectable } from '@nestjs/common';
import { RedisService } from './redis';

const RIDERS_LOCATION_KEY = 'riders:locations';

@Injectable()
export class LocationService {
  constructor(private readonly redisService: RedisService) {}

  async updateLocation(
    riderId: string,
    latitude: number,
    longitude: number,
  ): Promise<boolean> {
    await this.redisService.geoadd(RIDERS_LOCATION_KEY, longitude, latitude, riderId);
    return true;
  }

  async getNearbyRiders(
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit: number = 10,
  ): Promise<Array<{ riderId: string; latitude: number; longitude: number; distanceKm: number }>> {
    const results = await this.redisService.georadius(
      RIDERS_LOCATION_KEY,
      longitude,
      latitude,
      radiusKm,
      'km',
      { withCoord: true, withDist: true, count: limit },
    );

    return results.map((result: any) => ({
      riderId: result[0],
      distanceKm: parseFloat(result[1]),
      longitude: parseFloat(result[2][0]),
      latitude: parseFloat(result[2][1]),
    }));
  }

  async getRiderLocation(
    riderId: string,
  ): Promise<{ riderId: string; latitude: number; longitude: number } | null> {
    const pos = await this.redisService.geopos(RIDERS_LOCATION_KEY, riderId);
    if (!pos) return null;

    return {
      riderId,
      longitude: parseFloat(pos[0]),
      latitude: parseFloat(pos[1]),
    };
  }
}
