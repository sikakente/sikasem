import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseItemDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  unitCostGbp!: number;

  @ApiProperty()
  @IsNumber()
  totalCostGbp!: number;

  @ApiProperty()
  @IsNumber()
  fxRatePurchase!: number;

  @ApiProperty()
  @IsNumber()
  totalCostGhsEquivalent!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
