import { Controller, Post, Body, Get } from '@nestjs/common';
import { LocationService } from './location.service';
import { UpdateLocationDto } from './dto';

@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Post()
  async updateLocation(@Body() dto: UpdateLocationDto) {
    const success = await this.locationService.updateLocation(
      dto.riderId,
      dto.latitude,
      dto.longitude,
    );
    return { success };
  }
}
