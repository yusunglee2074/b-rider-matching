import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RiderService } from './rider.service';
import { CreateRiderDto, UpdateRiderDto, UpdateRiderStatusDto } from '@app/common';

@Controller('riders')
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  @Post()
  create(@Body() createRiderDto: CreateRiderDto) {
    return this.riderService.create(createRiderDto);
  }

  @Get()
  findAll() {
    return this.riderService.findAll();
  }

  @Get('available')
  findAvailable() {
    return this.riderService.findAvailable();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.riderService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRiderDto: UpdateRiderDto,
  ) {
    return this.riderService.update(id, updateRiderDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateRiderStatusDto,
  ) {
    return this.riderService.updateStatus(id, updateStatusDto);
  }
}
