import { Module } from '@nestjs/common';
import { ReceivingService } from './receiving.service';
import { ReceivingController } from './receiving.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  providers: [ReceivingService],
  controllers: [ReceivingController],
})
export class ReceivingModule {}
