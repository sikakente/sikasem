import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiBearerAuth()
@Controller('customers')
@UseGuards(RolesGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @Roles('admin', 'operations', 'finance', 'pos_cashier', 'viewer')
  findAll(@Query() query: CustomerQueryDto) {
    return this.customersService.findAll(query);
  }

  @Post()
  @Roles('admin', 'operations', 'pos_cashier')
  create(
    @Body() dto: CreateCustomerDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.customersService.create(dto, req.user.sub);
  }

  @Get(':id')
  @Roles('admin', 'operations', 'finance', 'pos_cashier', 'viewer')
  findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Patch(':id')
  @Roles('admin', 'operations')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.customersService.update(id, dto, req.user.sub);
  }

  @Get(':id/sales')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getSalesHistory(@Param('id') id: string, @Query() query: PaginationDto) {
    return this.customersService.getSalesHistory(id, query);
  }
}
