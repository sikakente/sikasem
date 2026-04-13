import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FxQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['purchase', 'sale', 'conversion'] })
  @IsOptional()
  @IsIn(['purchase', 'sale', 'conversion'])
  eventType?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
