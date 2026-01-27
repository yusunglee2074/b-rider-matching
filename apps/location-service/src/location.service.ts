import { Injectable } from '@nestjs/common';
import { RedisService } from './redis';

const RIDERS_LOCATION_KEY = 'riders:locations';
const RIDER_STATUS_AVAILABLE = 'AVAILABLE';

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
    // Get more riders than limit to account for filtering
    const fetchLimit = limit * 3;
    const results = await this.redisService.georadius(
      RIDERS_LOCATION_KEY,
      longitude,
      latitude,
      radiusKm,
      'km',
      { withCoord: true, withDist: true, count: fetchLimit },
    );

    if (results.length === 0) {
      return [];
    }

    // Extract rider IDs and get their statuses
    const riderIds = results.map((result: any) => result[0]);
    const statuses = await this.redisService.getRiderStatuses(riderIds);

    // Filter to only AVAILABLE riders and map to response format
    const availableRiders = results
      .filter((result: any) => {
        const riderId = result[0];
        const status = statuses.get(riderId);
        return status === RIDER_STATUS_AVAILABLE;
      })
      .map((result: any) => ({
        riderId: result[0],
        distanceKm: parseFloat(result[1]),
        longitude: parseFloat(result[2][0]),
        latitude: parseFloat(result[2][1]),
      }));

    // Sort by distance (closest first) and limit
    return availableRiders
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
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
