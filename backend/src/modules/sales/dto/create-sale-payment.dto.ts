import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSalePaymentDto {
  @ApiProperty({ enum: ['cash', 'card', 'mobile_money', 'transfer'] })
  @IsString()
  paymentMethod!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amountGhs!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentReference?: string;
}
