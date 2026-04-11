import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { AddShipmentItemDto } from './dto/add-shipment-item.dto';
import { CreateShipmentCostDto } from './dto/create-shipment-cost.dto';
import { ShipmentQueryDto } from './dto/shipment-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiBearerAuth()
@Controller('shipments')
@UseGuards(RolesGuard)
export class ShipmentsController {
  constructor(private shipmentsService: ShipmentsService) {}

  @Get()
  @Roles('admin', 'operations', 'warehouse', 'finance', 'viewer')
  findAll(@Query() query: ShipmentQueryDto) {
    return this.shipmentsService.findAll(query);
  }

  @Post()
  @Roles('admin', 'operations')
  create(
    @Body() dto: CreateShipmentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.shipmentsService.create(dto, req.user.id);
  }

  @Get(':id')
  @Roles('admin', 'operations', 'warehouse', 'finance', 'viewer')
  findById(@Param('id') id: string) {
    return this.shipmentsService.findById(id);
  }

  @Patch(':id')
  @Roles('admin', 'operations')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.shipmentsService.update(id, dto, req.user.id);
  }

  @Post(':id/items')
  @Roles('admin', 'operations', 'warehouse')
  addItem(
    @Param('id') id: string,
    @Body() dto: AddShipmentItemDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.shipmentsService.addItem(id, dto, req.user.id);
  }

  @Delete(':id/items/:itemId')
  @Roles('admin', 'operations')
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.shipmentsService.removeItem(id, itemId, req.user.id);
  }

  @Post(':id/dispatch')
  @Roles('admin', 'operations')
  @RequirePermission('shipments.dispatch')
  @UseGuards(PermissionsGuard)
  dispatch(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.shipmentsService.dispatch(id, req.user.id);
  }

  @Post(':id/costs')
  @Roles('admin', 'operations', 'finance')
  addCost(
    @Param('id') id: string,
    @Body() dto: CreateShipmentCostDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.shipmentsService.addCost(id, dto, req.user.id);
  }

  @Get(':id/costs')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getCosts(@Param('id') id: string) {
    return this.shipmentsService.getCosts(id);
  }

  @Get(':id/status-history')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getStatusHistory(@Param('id') id: string) {
    return this.shipmentsService.getStatusHistory(id);
  }
}
