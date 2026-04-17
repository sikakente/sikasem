import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateOpportunityStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string;
}
