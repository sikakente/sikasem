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
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReceivingItemDto {
  @ApiPropertyOptional()
  @IsUUID()
  id!: string;

  @ApiPropertyOptional()
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
}

export class UpdateReceivingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [UpdateReceivingItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateReceivingItemDto)
  items?: UpdateReceivingItemDto[];
}
