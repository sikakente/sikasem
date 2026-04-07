import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @Roles('admin', 'operations', 'warehouse', 'finance', 'viewer')
  getBalances(@Query() query: InventoryQueryDto) {
    return this.inventoryService.getBalances(query);
  }

  @Get('movements')
  @Roles('admin', 'operations', 'warehouse', 'finance')
  getMovements(@Query() query: InventoryQueryDto) {
    return this.inventoryService.getMovements(query);
  }

  @Post('adjustments')
  @Roles('admin', 'operations', 'warehouse')
  @RequirePermission('inventory.adjust')
  @UseGuards(PermissionsGuard)
  createAdjustment(
    @Body() dto: CreateAdjustmentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.inventoryService.createAdjustment(dto, req.user.id);
  }

  @Get('product/:id')
  @Roles('admin', 'operations', 'warehouse', 'finance', 'viewer')
  getProductStock(@Param('id') id: string) {
    return this.inventoryService.getProductStock(id);
  }
}
