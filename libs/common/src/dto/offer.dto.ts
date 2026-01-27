import { IsUUID, IsEnum } from 'class-validator';
import { OfferStatus } from '@app/database';

export class CreateOfferDto {
  @IsUUID()
  deliveryId: string;

  @IsUUID()
  riderId: string;
}

export class RespondOfferDto {
  @IsEnum(OfferStatus, {
    message: 'status must be either ACCEPTED or REJECTED',
  })
  status: OfferStatus.ACCEPTED | OfferStatus.REJECTED;
}
