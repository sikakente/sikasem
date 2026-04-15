import { Body, Controller, Get, Patch, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { BusinessProfileDto } from './dto/business-profile.dto';
import { NotificationSettingsDto } from './dto/notification-settings.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('business-profile')
  @Roles('admin', 'finance', 'viewer')
  getBusinessProfile() {
    return this.settingsService.getBusinessProfile();
  }

  @Patch('business-profile')
  @Roles('admin')
  setBusinessProfile(
    @Body() dto: BusinessProfileDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.settingsService.setBusinessProfile(dto, req.user.sub);
  }

  @Get('notifications')
  @Roles('admin')
  getNotificationSettings() {
    return this.settingsService.getNotificationSettings();
  }

  @Patch('notifications')
  @Roles('admin')
  setNotificationSettings(
    @Body() dto: NotificationSettingsDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.settingsService.setNotificationSettings(dto, req.user.sub);
  }
}
