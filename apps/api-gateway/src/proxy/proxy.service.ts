import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly coreServiceUrl: string;
  private readonly locationServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.coreServiceUrl =
      this.configService.get<string>('CORE_SERVICE_URL') ||
      'http://localhost:3001';
    this.locationServiceUrl =
      this.configService.get<string>('LOCATION_SERVICE_URL') ||
      'http://localhost:3003';
  }

  private getTargetUrl(path: string): string {
    // Route /location requests to Location Service
    if (path.startsWith('/location')) {
      return this.locationServiceUrl;
    }
    return this.coreServiceUrl;
  }

  async forward(
    method: Method,
    path: string,
    user: JwtPayload | undefined,
    body?: unknown,
    headers?: Record<string, string>,
    query?: Record<string, string>,
  ): Promise<{ data: unknown; status: number; headers: Record<string, string> }> {
    const targetUrl = this.getTargetUrl(path);
    const url = `${targetUrl}${path}`;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward user info from JWT
    if (user) {
      requestHeaders['X-User-Id'] = user.sub;
      requestHeaders['X-User-Email'] = user.email;
      requestHeaders['X-User-Role'] = user.role;
    }

    // Forward selected headers
    if (headers) {
      const forwardHeaders = ['accept', 'accept-language', 'x-request-id'];
      for (const key of forwardHeaders) {
        if (headers[key]) {
          requestHeaders[key] = headers[key];
        }
      }
    }

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: requestHeaders,
      params: query,
      data: body,
      validateStatus: () => true, // Don't throw on any status
    };

    try {
      this.logger.debug(`Proxying ${method} ${url}`);
      const response = await firstValueFrom(this.httpService.request(config));

      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      this.logger.error(`Proxy error: ${error.message}`, error.stack);

      if (error.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        'Bad Gateway',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
