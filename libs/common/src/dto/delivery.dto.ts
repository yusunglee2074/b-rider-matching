import { IsString, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateDeliveryDto {
  @IsUUID()
  storeId: string;

  @IsString()
  pickupAddress: string;

  @IsNumber()
  pickupLatitude: number;

  @IsNumber()
  pickupLongitude: number;

  @IsString()
  dropoffAddress: string;

  @IsNumber()
  dropoffLatitude: number;

  @IsNumber()
  dropoffLongitude: number;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
