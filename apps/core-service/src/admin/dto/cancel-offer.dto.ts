import { IsString, IsOptional } from 'class-validator';

export class CancelOfferDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
