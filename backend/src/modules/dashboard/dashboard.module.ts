import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { FxModule } from '../fx/fx.module';

@Module({
  imports: [FxModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
