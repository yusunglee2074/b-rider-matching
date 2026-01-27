import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { LocationModule } from './../src/location.module';
import { RedisService } from './../src/redis';

describe('LocationController (e2e)', () => {
  let app: INestApplication;

  const mockRedisService = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    getClient: jest.fn(),
    geoadd: jest.fn().mockResolvedValue(1),
    georadius: jest.fn().mockResolvedValue([]),
    geopos: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LocationModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /location/health', () => {
    it('should return ok status', () => {
      return request(app.getHttpServer())
        .get('/location/health')
        .expect(200)
        .expect({ status: 'ok' });
    });
  });

  describe('POST /location', () => {
    it('should update rider location', () => {
      return request(app.getHttpServer())
        .post('/location')
        .send({
          riderId: 'rider-1',
          latitude: 37.5665,
          longitude: 126.978,
        })
        .expect(201)
        .expect({ success: true });
    });

    it('should call redis geoadd with correct params', async () => {
      await request(app.getHttpServer())
        .post('/location')
        .send({
          riderId: 'rider-2',
          latitude: 37.5665,
          longitude: 126.978,
        });

      expect(mockRedisService.geoadd).toHaveBeenCalledWith(
        'riders:locations',
        126.978,
        37.5665,
        'rider-2',
      );
    });
  });
});
