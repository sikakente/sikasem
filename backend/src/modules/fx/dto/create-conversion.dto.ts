import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SaleLinkDto {
  @ApiProperty()
  @IsUUID()
  saleId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amountGhsAllocated!: number;
}

export class CreateConversionDto {
  @ApiProperty({ example: '2024-03-15' })
  @IsDateString()
  conversionDate!: string;

  @ApiProperty({ description: 'GHS amount being converted' })
  @IsNumber()
  @Min(0)
  sourceAmountGhs!: number;

  @ApiProperty({
    description: 'GBP per 1 GHS (e.g. 0.065 means 1 GHS = 0.065 GBP)',
  })
  @IsNumber()
  @Min(0)
  exchangeRate!: number;

  @ApiProperty({ description: 'GBP amount received' })
  @IsNumber()
  @Min(0)
  destinationAmountGbp!: number;

  @ApiPropertyOptional({ description: 'Bank fees in GBP' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  feesGbp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [SaleLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLinkDto)
  saleLinks?: SaleLinkDto[];
}
