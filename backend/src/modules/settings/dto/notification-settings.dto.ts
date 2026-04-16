import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class NotificationSettingsDto {
  @IsBoolean()
  alertEmailEnabled: boolean;

  @IsArray()
  @IsEmail({}, { each: true })
  alertEmailRecipients: string[];

  @IsOptional()
  @IsNumber()
  lowStockThresholdOverride?: number;

  @IsOptional()
  @IsNumber()
  fxLossThresholdGbp?: number;
}
