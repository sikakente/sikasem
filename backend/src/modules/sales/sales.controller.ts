import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { VoidSaleDto } from './dto/void-sale.dto';
import { SaleQueryDto } from './dto/sale-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiBearerAuth()
@Controller('sales')
@UseGuards(RolesGuard)
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  @Roles('admin', 'operations', 'finance', 'pos_cashier', 'viewer')
  findAll(@Query() query: SaleQueryDto) {
    return this.salesService.findAll(query);
  }

  @Post()
  @Roles('admin', 'operations', 'pos_cashier')
  create(@Body() dto: CreateSaleDto, @Request() req: { user: { sub: string } }) {
    return this.salesService.create(dto, req.user.sub);
  }

  @Get(':id')
  @Roles('admin', 'operations', 'finance', 'pos_cashier', 'viewer')
  findById(@Param('id') id: string) {
    return this.salesService.findById(id);
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'operations')
  @RequirePermission('sales.void')
  @UseGuards(PermissionsGuard)
  void(
    @Param('id') id: string,
    @Body() dto: VoidSaleDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.salesService.void(id, dto, req.user.sub);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @Roles('admin')
  @RequirePermission('sales.refund')
  @UseGuards(PermissionsGuard)
  refund() {
    return { message: 'Refund not implemented in MVP' };
  }
}
