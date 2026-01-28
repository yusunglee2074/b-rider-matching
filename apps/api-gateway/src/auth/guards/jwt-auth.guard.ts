import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/demo/',
  '/api/stores',
  '/api/riders',
  '/api/deliveries',
  '/api/offers',
  '/api/location',
];

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if the request path is in the public paths list
    const request = context.switchToHttp().getRequest();
    const path = request.path || request.url;

    if (PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath))) {
      return true;
    }

    return super.canActivate(context);
  }
}
