import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BusinessProfileDto } from './dto/business-profile.dto';
import { NotificationSettingsDto } from './dto/notification-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async get(key: string): Promise<any> {
    const record = await this.prisma.setting.findUnique({ where: { key } });
    return record ? record.value : null;
  }

  async set(key: string, value: object, userId: string): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key },
      update: { value, updatedBy: userId },
      create: { key, value, updatedBy: userId },
    });

    this.audit.log({
      userId,
      actionType: 'update',
      entityType: 'setting',
      entityId: key,
      afterJson: value,
    });
  }

  async getBusinessProfile(): Promise<any> {
    return this.get('business_profile');
  }

  async setBusinessProfile(
    dto: BusinessProfileDto,
    userId: string,
  ): Promise<void> {
    return this.set('business_profile', dto, userId);
  }

  async getNotificationSettings(): Promise<any> {
    return this.get('notification_settings');
  }

  async setNotificationSettings(
    dto: NotificationSettingsDto,
    userId: string,
  ): Promise<void> {
    return this.set('notification_settings', dto, userId);
  }
}
