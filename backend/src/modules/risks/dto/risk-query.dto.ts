import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class RiskQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: [
      'stockout',
      'shipment_delay',
      'margin_drop',
      'supplier_concentration',
      'fx_loss',
    ],
  })
  @IsOptional()
  @IsString()
  riskType?: string;

  @ApiPropertyOptional({ enum: ['open', 'monitoring', 'closed'] })
  @IsOptional()
  @IsString()
  status?: string;
}
