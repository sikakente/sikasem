import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddShipmentItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourcePurchaseItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
