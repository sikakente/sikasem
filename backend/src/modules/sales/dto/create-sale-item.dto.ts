import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSaleItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPriceGhs!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmountGhs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchId?: string;
}
