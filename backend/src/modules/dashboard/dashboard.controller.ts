import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiBearerAuth()
@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getSummary(@Query() query: DashboardQueryDto) {
    return this.dashboard.getSummary(query);
  }

  @Get('revenue')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getRevenue(@Query() query: DashboardQueryDto) {
    return this.dashboard.getRevenueDrilldown(query);
  }

  @Get('shipments')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getShipments() {
    return this.dashboard.getShipmentDrilldown();
  }

  @Get('fx')
  @Roles('admin', 'finance', 'viewer')
  getFx(@Query() query: DashboardQueryDto) {
    return this.dashboard.getFxSummaryPublic(query);
  }

  @Get('top-products')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getTopProducts(@Query() query: DashboardQueryDto) {
    return this.dashboard.getTopProductsPublic(query);
  }

  @Get('risks')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getRisks() {
    return this.dashboard.getTopRisksPublic();
  }
}
