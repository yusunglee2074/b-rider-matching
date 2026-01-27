import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignDeliveryDto {
  @IsString()
  @IsNotEmpty()
  riderId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
