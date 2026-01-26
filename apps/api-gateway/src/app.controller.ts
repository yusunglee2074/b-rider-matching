import { Controller, Get, Post, Body } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import type { JwtPayload } from './auth/interfaces/jwt-payload.interface';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'api-gateway' };
  }

  @Public()
  @Post('auth/login')
  login(@Body() body: { email: string; role?: 'rider' | 'store' | 'admin' }) {
    // 테스트용 로그인 엔드포인트 (실제로는 Core Service에서 인증)
    const payload: JwtPayload = {
      sub: `user-${Date.now()}`,
      email: body.email,
      role: body.role || 'rider',
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
