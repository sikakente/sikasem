import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePurchaseItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitCostGbp!: number;

  @IsNumber()
  totalCostGbp!: number;

  @IsNumber()
  fxRatePurchase!: number;

  @IsNumber()
  totalCostGhsEquivalent!: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  batchReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
