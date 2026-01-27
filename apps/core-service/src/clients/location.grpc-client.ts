import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc, Client, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

interface RiderLocation {
  riderId: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

interface GetNearbyRidersRequest {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
}

interface GetNearbyRidersResponse {
  riders: RiderLocation[];
}

interface LocationServiceGrpc {
  getNearbyRiders(request: GetNearbyRidersRequest): Observable<GetNearbyRidersResponse>;
}

@Injectable()
export class LocationGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(LocationGrpcClient.name);
  private locationService: LocationServiceGrpc;
  private client: ClientGrpc;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // Client will be initialized when needed
  }

  private getClient(): ClientGrpc {
    if (!this.client) {
      const { ClientProxyFactory } = require('@nestjs/microservices');
      this.client = ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: {
          package: 'location',
          protoPath: join(process.cwd(), 'libs/proto/src/location.proto'),
          url: this.configService.get<string>('LOCATION_GRPC_URL') || 'localhost:5003',
        },
      });
      this.locationService = this.client.getService<LocationServiceGrpc>('LocationService');
    }
    return this.client;
  }

  async getNearbyRiders(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    limit: number = 10,
  ): Promise<RiderLocation[]> {
    try {
      this.getClient();

      const response = await firstValueFrom(
        this.locationService.getNearbyRiders({
          latitude,
          longitude,
          radiusKm,
          limit,
        }).pipe(
          timeout(5000),
          catchError((error) => {
            this.logger.warn(`Failed to get nearby riders: ${error.message}`);
            return of({ riders: [] });
          }),
        ),
      );

      return response.riders || [];
    } catch (error) {
      this.logger.error(`gRPC call failed: ${error.message}`);
      return [];
    }
  }
}
