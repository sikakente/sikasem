import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export type SupplierType = 'shop' | 'wholesaler' | 'importer' | 'other';

export class CreateSupplierDto {
  @IsString()
  name!: string;

  @IsIn(['shop', 'wholesaler', 'importer', 'other'])
  supplierType!: SupplierType;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsString()
  country!: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
