import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RisksService } from './risks.service';
import { RiskQueryDto } from './dto/risk-query.dto';

class UpdateRiskStatusDto {
  status!: string;
}

@ApiTags('risks')
@Controller('risks')
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Get()
  @Roles('admin', 'operations', 'finance', 'viewer')
  findAll(@Query() query: RiskQueryDto) {
    return this.risksService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'operations', 'finance', 'viewer')
  findOne(@Param('id') id: string) {
    return this.risksService.findById(id);
  }

  @Patch(':id/status')
  @Roles('admin', 'operations', 'finance')
  updateStatus(@Param('id') id: string, @Body() body: UpdateRiskStatusDto) {
    return this.risksService.updateStatus(id, body.status, '');
  }
}
