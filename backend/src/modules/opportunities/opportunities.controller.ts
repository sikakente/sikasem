import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { OpportunitiesService } from './opportunities.service';
import { OpportunityQueryDto } from './dto/opportunity-query.dto';

class UpdateOpportunityStatusDto {
  status!: string;
}

@ApiTags('opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  @Roles('admin', 'operations', 'finance', 'viewer')
  findAll(@Query() query: OpportunityQueryDto) {
    return this.opportunitiesService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'operations', 'finance', 'viewer')
  findOne(@Param('id') id: string) {
    return this.opportunitiesService.findById(id);
  }

  @Patch(':id/status')
  @Roles('admin', 'operations')
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateOpportunityStatusDto,
  ) {
    return this.opportunitiesService.updateStatus(id, body.status, '');
  }
}
