import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles('admin', 'finance', 'operations', 'viewer')
  listReportTypes() {
    return this.reportsService.getReportTypes();
  }

  @Get(':type')
  @Roles('admin', 'finance', 'operations', 'viewer')
  @RequirePermission('reports.export')
  @UseGuards(PermissionsGuard)
  async runReport(
    @Param('type') type: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.reportsService.run(type, query);

    if (result.format !== 'json') {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`,
      );
      res.send(result.buffer);
      return;
    }

    return result;
  }
}
