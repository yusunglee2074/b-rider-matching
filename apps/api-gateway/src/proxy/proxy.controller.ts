import {
  Controller,
  All,
  Req,
  Res,
  Param,
} from '@nestjs/common';
import * as express from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Method } from 'axios';

@Controller('api')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All('*path')
  async proxy(
    @Param('path') path: string,
    @Req() req: express.Request,
    @Res() res: express.Response,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.proxyService.forward(
      req.method as Method,
      `/${path}`,
      user,
      req.body,
      req.headers as Record<string, string>,
      req.query as Record<string, string>,
    );

    res.status(result.status).json(result.data);
  }
}
