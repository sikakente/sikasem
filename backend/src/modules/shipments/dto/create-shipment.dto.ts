import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShipmentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  shipmentReference: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shipmentName?: string;

  @ApiProperty()
  @IsUUID()
  originLocationId: string;

  @ApiProperty()
  @IsUUID()
  destinationLocationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrierName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  packedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dispatchDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedArrivalDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
