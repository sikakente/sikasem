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
import { ReceivingService } from './receiving.service';
import { CreateReceivingDto } from './dto/create-receiving.dto';
import { UpdateReceivingDto } from './dto/update-receiving.dto';
import { ReceivingQueryDto } from './dto/receiving-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiBearerAuth()
@Controller('receiving')
@UseGuards(RolesGuard)
export class ReceivingController {
  constructor(private receivingService: ReceivingService) {}

  @Get()
  @Roles('admin', 'operations', 'warehouse', 'finance', 'viewer')
  findAll(@Query() query: ReceivingQueryDto) {
    return this.receivingService.findAll(query);
  }

  // NOTE: 'queue' must be declared before ':id' to avoid route conflict
  @Get('queue')
  @Roles('admin', 'operations', 'warehouse')
  getQueue() {
    return this.receivingService.getQueue();
  }

  @Post()
  @Roles('admin', 'operations', 'warehouse')
  @RequirePermission('shipments.receive')
  @UseGuards(PermissionsGuard)
  create(
    @Body() dto: CreateReceivingDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.receivingService.create(dto, req.user.sub);
  }

  @Get(':id')
  @Roles('admin', 'operations', 'warehouse', 'finance', 'viewer')
  findById(@Param('id') id: string) {
    return this.receivingService.findById(id);
  }

  @Patch(':id')
  @Roles('admin', 'operations', 'warehouse')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReceivingDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.receivingService.update(id, dto, req.user.sub);
  }

  @Post(':id/submit')
  @Roles('admin', 'operations', 'warehouse')
  @RequirePermission('shipments.receive')
  @UseGuards(PermissionsGuard)
  submit(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.receivingService.submit(id, req.user.sub);
  }
}
