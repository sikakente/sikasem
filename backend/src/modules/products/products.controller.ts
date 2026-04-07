import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @Roles('admin', 'operations', 'warehouse', 'finance', 'viewer')
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Post()
  @Roles('admin', 'operations')
  create(@Body() dto: CreateProductDto, @Request() req: { user: { sub: string } }) {
    return this.productsService.create(dto, req.user.sub);
  }

  @Get('categories')
  @Roles('admin', 'operations', 'warehouse', 'finance', 'viewer')
  getCategories() {
    return this.productsService.getCategories();
  }

  @Post('categories')
  @Roles('admin')
  createCategory(@Body() body: { name: string; description?: string }) {
    return this.productsService.createCategory(body.name, body.description);
  }

  @Get('barcode/:barcode')
  @Roles('admin', 'operations', 'warehouse', 'pos_cashier')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get(':id')
  @Roles('admin', 'operations', 'warehouse', 'finance', 'viewer')
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Patch(':id')
  @Roles('admin', 'operations')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.productsService.update(id, dto, req.user.sub);
  }

  @Get(':id/stock')
  @Roles('admin', 'operations', 'warehouse', 'finance', 'viewer')
  getStock(@Param('id') id: string) {
    return this.productsService.getStockByLocation(id);
  }

  @Get(':id/history')
  @Roles('admin', 'operations', 'finance')
  getHistory(@Param('id') id: string) {
    return this.productsService.getHistory(id);
  }
}
