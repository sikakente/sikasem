import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateRiskStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string;
}
