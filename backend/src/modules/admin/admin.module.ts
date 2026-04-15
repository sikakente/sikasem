import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { RisksModule } from '../risks/risks.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';

@Module({
  imports: [AlertsModule, RisksModule, OpportunitiesModule],
  controllers: [AdminController],
})
export class AdminModule {}
