import { Controller, Get } from '@nestjs/common';
import { RiderService } from './rider.service';

@Controller()
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  @Get()
  getHello(): string {
    return this.riderService.getHello();
  }
}
