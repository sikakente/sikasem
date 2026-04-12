import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateReceivingItemDto } from './create-receiving-item.dto';

export class CreateReceivingDto {
  @ApiProperty()
  @IsUUID()
  shipmentId: string;

  @ApiPropertyOptional({
    description: 'Defaults to Ghana Warehouse if omitted',
  })
  @IsOptional()
  @IsUUID()
  receivedLocationId?: string;

  @ApiProperty()
  @IsDateString()
  receivedDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateReceivingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceivingItemDto)
  items: CreateReceivingItemDto[];
}
