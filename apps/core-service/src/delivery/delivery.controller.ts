import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryDto } from '@app/common';
import { DeliveryStatus } from '@app/database';

@Controller('deliveries')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post()
  create(@Body() createDeliveryDto: CreateDeliveryDto) {
    return this.deliveryService.create(createDeliveryDto);
  }

  @Get()
  findAll() {
    return this.deliveryService.findAll();
  }

  @Get('pending')
  findPending() {
    return this.deliveryService.findPending();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveryService.findOne(id);
  }

  @Patch(':id/pickup')
  setPickedUp(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveryService.setPickedUp(id);
  }

  @Patch(':id/deliver')
  setDelivered(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveryService.setDelivered(id);
  }

  @Patch(':id/cancel')
  setCancelled(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveryService.setCancelled(id);
  }

  @Patch(':id/cancel-by-rider')
  cancelByRider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('riderId', ParseUUIDPipe) riderId: string,
  ) {
    return this.deliveryService.cancelByRider(id, riderId);
  }
}
