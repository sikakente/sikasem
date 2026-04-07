import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  unitType!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultCostPriceGbp?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultSellingPriceGhs?: number;

  @IsNumber()
  @Min(0)
  minimumStockThreshold!: number;

  @IsBoolean()
  expiryTrackingEnabled!: boolean;

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsString({ each: true })
  additionalBarcodes?: string[];
}
