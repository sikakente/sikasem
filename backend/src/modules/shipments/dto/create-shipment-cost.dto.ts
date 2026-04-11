import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ShipmentCostType {
  FREIGHT = 'freight',
  CUSTOMS = 'customs',
  TRANSPORT = 'transport',
  INSURANCE = 'insurance',
  PACKAGING = 'packaging',
  HANDLING = 'handling',
  OTHER = 'other',
}

export class CreateShipmentCostDto {
  @ApiProperty({ enum: ShipmentCostType })
  @IsEnum(ShipmentCostType)
  costType!: ShipmentCostType;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amountGbp!: number;

  @ApiProperty()
  @IsDateString()
  costDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorName?: string;
}
