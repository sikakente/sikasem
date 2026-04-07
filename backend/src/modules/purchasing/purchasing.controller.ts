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
import { PurchasingService } from './purchasing.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('purchases')
@UseGuards(RolesGuard)
export class PurchasingController {
  constructor(private purchasingService: PurchasingService) {}

  @Get()
  @Roles('admin', 'operations', 'finance', 'viewer')
  findAll(@Query() query: PurchaseQueryDto) {
    return this.purchasingService.findAll(query);
  }

  @Post()
  @Roles('admin', 'operations')
  create(@Body() dto: CreatePurchaseDto, @Request() req: { user: { id: string } }) {
    return this.purchasingService.create(dto, req.user.id);
  }

  @Get(':id')
  @Roles('admin', 'operations', 'finance', 'viewer')
  findById(@Param('id') id: string) {
    return this.purchasingService.findById(id);
  }

  @Patch(':id')
  @Roles('admin', 'operations')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.purchasingService.update(id, dto, req.user.id);
  }

  @Post(':id/confirm')
  @Roles('admin', 'operations')
  confirm(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.purchasingService.confirm(id, req.user.id);
  }
}
