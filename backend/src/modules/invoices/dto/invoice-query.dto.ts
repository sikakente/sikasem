import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class InvoiceQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
  })
  @IsOptional()
  @IsIn(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @Type(() => Boolean)
  overdue?: boolean;
}
