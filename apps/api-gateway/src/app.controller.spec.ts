import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let jwtService: JwtService;

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    jwtService = app.get<JwtService>(JwtService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      expect(appController.health()).toEqual({
        status: 'ok',
        service: 'api-gateway',
      });
    });
  });

  describe('login', () => {
    it('should return access token for rider', () => {
      const result = appController.login({
        email: 'test@example.com',
        role: 'rider',
      });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          role: 'rider',
        }),
      );
      expect(result).toEqual({ access_token: 'mock-jwt-token' });
    });

    it('should default to rider role if not specified', () => {
      appController.login({ email: 'test@example.com' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          role: 'rider',
        }),
      );
    });
  });

  describe('getMe', () => {
    it('should return user payload', () => {
      const mockUser = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'rider' as const,
      };

      expect(appController.getMe(mockUser)).toEqual(mockUser);
    });
  });
});
