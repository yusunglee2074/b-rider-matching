import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { Roles } from './decorators/roles.decorator';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { ReassignDeliveryDto } from './dto/reassign-delivery.dto';
import { CancelOfferDto } from './dto/cancel-offer.dto';

@Controller('admin')
@UseGuards(AdminGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('deliveries/:id/assign')
  async assignDelivery(
    @Param('id') deliveryId: string,
    @Body() assignDto: AssignDeliveryDto,
  ) {
    return this.adminService.assignDelivery(
      deliveryId,
      assignDto.riderId,
      assignDto.reason,
    );
  }

  @Post('deliveries/:id/reassign')
  async reassignDelivery(
    @Param('id') deliveryId: string,
    @Body() reassignDto: ReassignDeliveryDto,
  ) {
    return this.adminService.reassignDelivery(
      deliveryId,
      reassignDto.newRiderId,
      reassignDto.reason,
    );
  }

  @Delete('offers/:id')
  async cancelOffer(
    @Param('id') offerId: string,
    @Body() cancelDto: CancelOfferDto,
  ) {
    return this.adminService.cancelOffer(offerId, cancelDto.reason);
  }

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboard();
  }
}
