import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class OpportunityQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['repricing', 'restock', 'consolidate_shipment', 'supplier_switch'],
  })
  @IsOptional()
  @IsString()
  opportunityType?: string;

  @ApiPropertyOptional({ enum: ['open', 'acted_on', 'dismissed'] })
  @IsOptional()
  @IsString()
  status?: string;
}
