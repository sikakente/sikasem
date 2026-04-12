import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiBearerAuth()
@Controller('receipts')
@UseGuards(RolesGuard)
export class ReceiptsController {
  constructor(private receiptsService: ReceiptsService) {}

  @Get()
  @Roles('admin', 'operations', 'finance', 'pos_cashier', 'viewer')
  findAll(@Query() query: PaginationDto) {
    return this.receiptsService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'operations', 'finance', 'pos_cashier', 'viewer')
  findById(@Param('id') id: string) {
    return this.receiptsService.findById(id);
  }

  @Get(':id/pdf')
  @Roles('admin', 'operations', 'finance', 'pos_cashier', 'viewer')
  getPdfUrl(@Param('id') id: string) {
    return this.receiptsService.getPdfUrl(id);
  }
}
