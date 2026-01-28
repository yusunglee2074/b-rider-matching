import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { DemoService } from './demo.service';

interface BulkSeedDto {
  storeCount?: number;
  riderCount?: number;
  deliveryCount?: number;
}

@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seed() {
    return this.demoService.seedDemoData();
  }

  @Post('seed/bulk')
  @HttpCode(HttpStatus.OK)
  async seedBulk(@Body() dto: BulkSeedDto) {
    return this.demoService.seedBulkData(dto.storeCount, dto.riderCount, dto.deliveryCount);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async reset() {
    return this.demoService.resetDemoData();
  }

  @Get('metrics')
  async getMetrics() {
    return this.demoService.getSystemMetrics();
  }
}
