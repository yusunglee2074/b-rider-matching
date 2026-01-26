import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ProxyService } from './proxy.service';

describe('ProxyService', () => {
  let service: ProxyService;
  let httpService: HttpService;

  const mockHttpService = {
    request: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3001'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
    httpService = module.get<HttpService>(HttpService);
    jest.clearAllMocks();
  });

  describe('forward', () => {
    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      role: 'rider' as const,
    };

    it('should forward GET request to core service', async () => {
      const mockResponse = {
        data: { id: 1, name: 'Test' },
        status: 200,
        headers: {},
      };
      mockHttpService.request.mockReturnValue(of(mockResponse));

      const result = await service.forward('GET', '/riders/1', mockUser);

      expect(result.status).toBe(200);
      expect(result.data).toEqual({ id: 1, name: 'Test' });
      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://localhost:3001/riders/1',
          headers: expect.objectContaining({
            'X-User-Id': 'user-123',
            'X-User-Email': 'test@example.com',
            'X-User-Role': 'rider',
          }),
        }),
      );
    });

    it('should forward POST request with body', async () => {
      const mockResponse = {
        data: { id: 1 },
        status: 201,
        headers: {},
      };
      mockHttpService.request.mockReturnValue(of(mockResponse));

      const body = { name: 'New Rider' };
      const result = await service.forward('POST', '/riders', mockUser, body);

      expect(result.status).toBe(201);
      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: body,
        }),
      );
    });

    it('should forward 4xx errors from core service', async () => {
      const mockResponse = {
        data: { message: 'Not Found' },
        status: 404,
        headers: {},
      };
      mockHttpService.request.mockReturnValue(of(mockResponse));

      const result = await service.forward('GET', '/riders/999', mockUser);

      expect(result.status).toBe(404);
      expect(result.data).toEqual({ message: 'Not Found' });
    });

    it('should throw 503 when core service is unavailable', async () => {
      const error = { code: 'ECONNREFUSED', message: 'Connection refused' };
      mockHttpService.request.mockReturnValue(throwError(() => error));

      await expect(
        service.forward('GET', '/riders/1', mockUser),
      ).rejects.toThrow(
        new HttpException('Core Service unavailable', HttpStatus.SERVICE_UNAVAILABLE),
      );
    });

    it('should throw 502 for other errors', async () => {
      const error = { code: 'UNKNOWN', message: 'Unknown error' };
      mockHttpService.request.mockReturnValue(throwError(() => error));

      await expect(
        service.forward('GET', '/riders/1', mockUser),
      ).rejects.toThrow(
        new HttpException('Bad Gateway', HttpStatus.BAD_GATEWAY),
      );
    });

    it('should work without user (public routes)', async () => {
      const mockResponse = {
        data: { status: 'ok' },
        status: 200,
        headers: {},
      };
      mockHttpService.request.mockReturnValue(of(mockResponse));

      const result = await service.forward('GET', '/health', undefined);

      expect(result.status).toBe(200);
      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'X-User-Id': expect.any(String),
          }),
        }),
      );
    });
  });
});
