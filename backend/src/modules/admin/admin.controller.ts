import { Controller, ForbiddenException, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AlertsService } from '../alerts/alerts.service';
import { RisksService } from '../risks/risks.service';
import { OpportunitiesService } from '../opportunities/opportunities.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly risksService: RisksService,
    private readonly opportunitiesService: OpportunitiesService,
  ) {}

  @Post('run-detection')
  @Roles('admin')
  async runDetection() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Manual trigger not available in production',
      );
    }

    await Promise.allSettled([
      this.alertsService.runAlertDetection(),
      this.risksService.runRiskDetection(),
      this.opportunitiesService.runOpportunityDetection(),
    ]);

    return { message: 'Detection jobs triggered successfully' };
  }
}
