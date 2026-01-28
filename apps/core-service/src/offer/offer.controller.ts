import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OfferService } from './offer.service';
import { CreateOfferDto } from '@app/common';

@Controller('offers')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  create(@Body() createOfferDto: CreateOfferDto) {
    return this.offerService.create(createOfferDto);
  }

  @Post('manual')
  createManual(@Body() createOfferDto: CreateOfferDto) {
    return this.offerService.create(createOfferDto);
  }

  @Get()
  findAll() {
    return this.offerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.offerService.findOne(id);
  }

  @Get('rider/:riderId')
  findPendingByRider(@Param('riderId', ParseUUIDPipe) riderId: string) {
    return this.offerService.findPendingByRider(riderId);
  }

  @Patch(':id/accept')
  accept(@Param('id', ParseUUIDPipe) id: string) {
    return this.offerService.accept(id);
  }

  @Patch(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.offerService.reject(id);
  }

  @Get('delivery/:deliveryId/nearby-riders')
  findNearbyRiders(@Param('deliveryId', ParseUUIDPipe) deliveryId: string) {
    return this.offerService.findNearbyRidersForDelivery(deliveryId);
  }
}
