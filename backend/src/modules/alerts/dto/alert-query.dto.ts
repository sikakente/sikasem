import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AlertQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({
    enum: ['low_stock', 'delay', 'fx_loss', 'cost_spike', 'expiry_risk'],
  })
  @IsOptional()
  @IsString()
  alertType?: string;

  @ApiPropertyOptional({
    enum: ['open', 'acknowledged', 'resolved', 'dismissed'],
  })
  @IsOptional()
  @IsString()
  status?: string;
}
