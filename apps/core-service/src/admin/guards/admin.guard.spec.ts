import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminGuard } from './admin.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockExecutionContext = (user: any): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as any);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<AdminGuard>(AdminGuard);
    reflector = module.get(Reflector);
  });

  it('should allow access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = mockExecutionContext({ role: 'rider' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access for admin user when admin role is required', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = mockExecutionContext({ sub: 'user-1', role: 'admin' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access for non-admin user when admin role is required', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = mockExecutionContext({ sub: 'user-1', role: 'rider' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when user has no role', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = mockExecutionContext({ sub: 'user-1' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when no user is present', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = mockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access for store user when store role is required', () => {
    reflector.getAllAndOverride.mockReturnValue(['store']);
    const context = mockExecutionContext({ sub: 'user-1', role: 'store' });

    expect(guard.canActivate(context)).toBe(true);
  });
});
