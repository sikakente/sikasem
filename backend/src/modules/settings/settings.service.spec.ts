import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BusinessProfileDto } from './dto/business-profile.dto';
import { NotificationSettingsDto } from './dto/notification-settings.dto';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: jest.Mocked<PrismaService>;
  let audit: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockPrisma = {
      setting: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    prisma = mockPrisma as any;
    audit = mockAudit as any;
  });

  describe('get()', () => {
    it('returns null for a key that does not exist', async () => {
      (prisma.setting.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.get('nonexistent_key');

      expect(result).toBeNull();
      expect(prisma.setting.findUnique).toHaveBeenCalledWith({
        where: { key: 'nonexistent_key' },
      });
    });

    it('returns the parsed value when the key exists', async () => {
      const value = { businessName: 'Acme Corp' };
      (prisma.setting.findUnique as jest.Mock).mockResolvedValue({
        key: 'business_profile',
        value,
        updatedAt: new Date(),
        updatedBy: 'user-1',
      });

      const result = await service.get('business_profile');

      expect(result).toEqual(value);
    });
  });

  describe('set()', () => {
    it('calls prisma.setting.upsert with the correct args', async () => {
      (prisma.setting.upsert as jest.Mock).mockResolvedValue({});

      await service.set('business_profile', { businessName: 'Acme' }, 'user-1');

      expect(prisma.setting.upsert).toHaveBeenCalledWith({
        where: { key: 'business_profile' },
        update: { value: { businessName: 'Acme' }, updatedBy: 'user-1' },
        create: {
          key: 'business_profile',
          value: { businessName: 'Acme' },
          updatedBy: 'user-1',
        },
      });
    });

    it('calls upsert twice when set is called twice with the same key', async () => {
      (prisma.setting.upsert as jest.Mock).mockResolvedValue({});

      await service.set('business_profile', { businessName: 'Acme' }, 'user-1');
      await service.set(
        'business_profile',
        { businessName: 'Acme Updated' },
        'user-1',
      );

      expect(prisma.setting.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.setting.upsert).toHaveBeenNthCalledWith(2, {
        where: { key: 'business_profile' },
        update: {
          value: { businessName: 'Acme Updated' },
          updatedBy: 'user-1',
        },
        create: {
          key: 'business_profile',
          value: { businessName: 'Acme Updated' },
          updatedBy: 'user-1',
        },
      });
    });

    it('fires audit.log after upsert', async () => {
      (prisma.setting.upsert as jest.Mock).mockResolvedValue({});

      await service.set('business_profile', { businessName: 'Acme' }, 'user-1');

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          actionType: 'update',
          entityType: 'setting',
          entityId: 'business_profile',
        }),
      );
    });
  });

  describe('getBusinessProfile()', () => {
    it('delegates to get("business_profile")', async () => {
      const getSpy = jest
        .spyOn(service, 'get')
        .mockResolvedValue({ businessName: 'Acme' });

      const result = await service.getBusinessProfile();

      expect(getSpy).toHaveBeenCalledWith('business_profile');
      expect(result).toEqual({ businessName: 'Acme' });
    });
  });

  describe('setBusinessProfile()', () => {
    it('delegates to set("business_profile", dto, userId) and calls auditService.log()', async () => {
      (prisma.setting.upsert as jest.Mock).mockResolvedValue({});

      const dto: BusinessProfileDto = {
        businessName: 'Test Co',
        contactEmail: 'test@example.com',
        contactPhone: '+44123456789',
        addressLine1: '1 Test Street',
        city: 'London',
        country: 'UK',
      };

      await service.setBusinessProfile(dto, 'user-1');

      expect(prisma.setting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'business_profile' },
          update: expect.objectContaining({ value: dto }),
          create: expect.objectContaining({
            key: 'business_profile',
            value: dto,
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('getNotificationSettings()', () => {
    it('delegates to get("notification_settings")', async () => {
      const getSpy = jest.spyOn(service, 'get').mockResolvedValue({
        alertEmailEnabled: true,
        alertEmailRecipients: [],
      });

      const result = await service.getNotificationSettings();

      expect(getSpy).toHaveBeenCalledWith('notification_settings');
      expect(result).toEqual({
        alertEmailEnabled: true,
        alertEmailRecipients: [],
      });
    });
  });

  describe('setNotificationSettings()', () => {
    it('delegates to set("notification_settings", dto, userId)', async () => {
      (prisma.setting.upsert as jest.Mock).mockResolvedValue({});

      const dto: NotificationSettingsDto = {
        alertEmailEnabled: true,
        alertEmailRecipients: ['admin@example.com'],
      };

      await service.setNotificationSettings(dto, 'user-1');

      expect(prisma.setting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'notification_settings' },
          update: expect.objectContaining({ value: dto }),
          create: expect.objectContaining({
            key: 'notification_settings',
            value: dto,
          }),
        }),
      );
    });

    it('calls auditService.log()', async () => {
      (prisma.setting.upsert as jest.Mock).mockResolvedValue({});

      const dto: NotificationSettingsDto = {
        alertEmailEnabled: false,
        alertEmailRecipients: [],
      };

      await service.setNotificationSettings(dto, 'user-2');

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          actionType: 'update',
          entityType: 'setting',
          entityId: 'notification_settings',
        }),
      );
    });
  });
});
