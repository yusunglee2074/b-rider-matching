import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ReassignDeliveryDto {
  @IsString()
  @IsNotEmpty()
  newRiderId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
