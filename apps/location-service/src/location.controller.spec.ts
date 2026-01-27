import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';

describe('LocationController', () => {
  let controller: LocationController;
  let service: jest.Mocked<LocationService>;

  beforeEach(async () => {
    const mockLocationService = {
      updateLocation: jest.fn(),
      getNearbyRiders: jest.fn(),
      getRiderLocation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [{ provide: LocationService, useValue: mockLocationService }],
    }).compile();

    controller = module.get<LocationController>(LocationController);
    service = module.get(LocationService);
  });

  describe('health', () => {
    it('should return ok status', () => {
      expect(controller.health()).toEqual({ status: 'ok' });
    });
  });

  describe('updateLocation', () => {
    it('should update location and return success', async () => {
      service.updateLocation.mockResolvedValue(true);

      const result = await controller.updateLocation({
        riderId: 'rider-1',
        latitude: 37.5665,
        longitude: 126.978,
      });

      expect(result).toEqual({ success: true });
      expect(service.updateLocation).toHaveBeenCalledWith(
        'rider-1',
        37.5665,
        126.978,
      );
    });
  });
});
