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
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';

import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  @Roles('admin', 'operations', 'finance', 'viewer')
  findAll(@Query() query: SupplierQueryDto) {
    return this.suppliersService.findAll(query);
  }

  @Post()
  @Roles('admin', 'operations')
  create(
    @Body() dto: CreateSupplierDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.suppliersService.create(dto, req.user.sub);
  }

  @Get(':id')
  @Roles('admin', 'operations', 'finance', 'viewer')
  findById(@Param('id') id: string) {
    return this.suppliersService.findById(id);
  }

  @Patch(':id')
  @Roles('admin', 'operations')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.suppliersService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @Roles('admin')
  deactivate(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.suppliersService.deactivate(id, req.user.sub);
  }

  @Get(':id/products')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getProducts(@Param('id') id: string) {
    return this.suppliersService.getProductsBySupplier(id);
  }

  @Get(':id/spend')
  @Roles('admin', 'finance')
  getSpend(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.suppliersService.getSpendSummary(id, from, to);
  }
}
