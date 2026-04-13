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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiBearerAuth()
@Controller('invoices')
@UseGuards(RolesGuard)
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  @Roles('admin', 'finance', 'operations', 'viewer')
  findAll(@Query() query: InvoiceQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Post()
  @Roles('admin', 'finance')
  create(
    @Body() dto: CreateInvoiceDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.invoicesService.create(dto, req.user.id);
  }

  @Get(':id')
  @Roles('admin', 'finance', 'operations', 'viewer')
  findById(@Param('id') id: string) {
    return this.invoicesService.findById(id);
  }

  @Patch(':id')
  @Roles('admin', 'finance')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.invoicesService.update(id, dto, req.user.id);
  }

  @Post(':id/mark-paid')
  @Roles('admin', 'finance')
  markPaid(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.invoicesService.markPaid(id, req.user.id);
  }

  @Get(':id/pdf')
  @Roles('admin', 'finance', 'operations', 'viewer')
  getPdfUrl(@Param('id') id: string) {
    return this.invoicesService.getPdfUrl(id);
  }
}
