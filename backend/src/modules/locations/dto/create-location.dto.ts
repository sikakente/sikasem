import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({ description: 'Location name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Location type',
    enum: ['UK_warehouse', 'Ghana_warehouse', 'Ghana_shop', 'shipment'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['UK_warehouse', 'Ghana_warehouse', 'Ghana_shop', 'shipment'])
  locationType: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Whether the location is active', default: true })
  @IsBoolean()
  isActive: boolean = true;
}
