import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';
import { RedisService } from './redis';

describe('LocationService', () => {
  let service: LocationService;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockRedisService = {
      geoadd: jest.fn(),
      georadius: jest.fn(),
      geopos: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    redisService = module.get(RedisService);
  });

  describe('updateLocation', () => {
    it('should update rider location', async () => {
      redisService.geoadd.mockResolvedValue(1);

      const result = await service.updateLocation('rider-1', 37.5665, 126.978);

      expect(result).toBe(true);
      expect(redisService.geoadd).toHaveBeenCalledWith(
        'riders:locations',
        126.978,
        37.5665,
        'rider-1',
      );
    });
  });

  describe('getNearbyRiders', () => {
    it('should return nearby riders', async () => {
      redisService.georadius.mockResolvedValue([
        ['rider-1', '0.5', ['126.978', '37.5665']],
        ['rider-2', '1.2', ['126.979', '37.5670']],
      ]);

      const result = await service.getNearbyRiders(37.5665, 126.978, 5, 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        riderId: 'rider-1',
        distanceKm: 0.5,
        longitude: 126.978,
        latitude: 37.5665,
      });
      expect(redisService.georadius).toHaveBeenCalledWith(
        'riders:locations',
        126.978,
        37.5665,
        5,
        'km',
        { withCoord: true, withDist: true, count: 10 },
      );
    });

    it('should return empty array when no riders nearby', async () => {
      redisService.georadius.mockResolvedValue([]);

      const result = await service.getNearbyRiders(37.5665, 126.978, 5, 10);

      expect(result).toHaveLength(0);
    });
  });

  describe('getRiderLocation', () => {
    it('should return rider location', async () => {
      redisService.geopos.mockResolvedValue(['126.978', '37.5665']);

      const result = await service.getRiderLocation('rider-1');

      expect(result).toEqual({
        riderId: 'rider-1',
        longitude: 126.978,
        latitude: 37.5665,
      });
    });

    it('should return null when rider not found', async () => {
      redisService.geopos.mockResolvedValue(null);

      const result = await service.getRiderLocation('unknown-rider');

      expect(result).toBeNull();
    });
  });
});
