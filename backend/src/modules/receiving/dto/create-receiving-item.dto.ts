import { IsUUID, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReceivingItemDto {
  @ApiProperty()
  @IsUUID()
  shipmentItemId!: string;

  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  receivedQuantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  damagedQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  lostQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
