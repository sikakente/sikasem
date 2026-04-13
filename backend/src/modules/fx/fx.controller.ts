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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FxService } from './fx.service';
import { CreateConversionDto } from './dto/create-conversion.dto';
import { FxQueryDto } from './dto/fx-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiBearerAuth()
@ApiTags('fx')
@Controller('fx')
@UseGuards(RolesGuard)
export class FxController {
  constructor(private fxService: FxService) {}

  @Get()
  @Roles('admin', 'finance', 'operations', 'viewer')
  findAll(@Query() query: FxQueryDto) {
    return this.fxService.findAll(query);
  }

  @Get('summary')
  @Roles('admin', 'finance', 'viewer')
  getSummary(@Query() query: FxQueryDto) {
    return this.fxService.getSummary(query);
  }

  @Get('latest-rate')
  @Roles('admin', 'finance', 'operations', 'pos_cashier')
  getLatestRate() {
    return this.fxService.getLatestSaleRate();
  }

  @Get('conversions')
  @Roles('admin', 'finance', 'viewer')
  findConversions(@Query() query: FxQueryDto) {
    return this.fxService.findConversions(query);
  }

  @Post('conversions')
  @Roles('admin', 'finance')
  @RequirePermission('fx.convert')
  @UseGuards(PermissionsGuard)
  createConversion(
    @Body() dto: CreateConversionDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.fxService.createConversion(dto, req.user.id);
  }

  @Get('conversions/:id')
  @Roles('admin', 'finance', 'viewer')
  findConversionById(@Param('id') id: string) {
    return this.fxService.findConversionById(id);
  }

  @Get(':id')
  @Roles('admin', 'finance', 'viewer')
  findById(@Param('id') id: string) {
    return this.fxService.findById(id);
  }
}
