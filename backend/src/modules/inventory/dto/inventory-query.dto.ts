import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class InventoryQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  lowStock?: boolean;

  @IsOptional()
  @IsString()
  movementType?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: Date;

  @IsOptional()
  @IsDateString()
  dateTo?: Date;
}
