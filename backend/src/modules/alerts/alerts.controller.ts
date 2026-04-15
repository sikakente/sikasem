import { Controller, Get, Param, Post, Query, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AlertsService } from './alerts.service';
import { AlertQueryDto } from './dto/alert-query.dto';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @Roles('admin', 'operations', 'finance', 'viewer')
  findAll(@Query() query: AlertQueryDto) {
    return this.alertsService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'operations', 'finance', 'viewer')
  findOne(@Param('id') id: string) {
    return this.alertsService.findById(id);
  }

  @Post(':id/acknowledge')
  @Roles('admin', 'operations', 'finance')
  acknowledge(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.alertsService.acknowledge(id, req.user.sub);
  }

  @Post(':id/resolve')
  @Roles('admin', 'operations', 'finance')
  resolve(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.alertsService.resolve(id, req.user.sub);
  }

  @Post(':id/dismiss')
  @Roles('admin', 'operations')
  dismiss(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.alertsService.dismiss(id, req.user.sub);
  }
}
