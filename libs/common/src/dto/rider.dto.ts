import { IsString, IsOptional, IsEnum } from 'class-validator';
import { RiderStatus } from '@app/database';

export class CreateRiderDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;
}

export class UpdateRiderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateRiderStatusDto {
  @IsEnum(RiderStatus)
  status: RiderStatus;
}
