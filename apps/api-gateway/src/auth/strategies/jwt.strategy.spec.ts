import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(mockConfigService);
  });

  describe('validate', () => {
    it('should return payload for valid token', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'rider' as const,
      };

      const result = strategy.validate(payload);

      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException if sub is missing', () => {
      const payload = {
        sub: '',
        email: 'test@example.com',
        role: 'rider' as const,
      };

      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if email is missing', () => {
      const payload = {
        sub: 'user-123',
        email: '',
        role: 'rider' as const,
      };

      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });
  });
});
