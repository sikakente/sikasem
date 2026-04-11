import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      auditLog: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = mockPrisma as any;
  });

  it('writes a record to audit_logs with the correct fields', async () => {
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    await service.log({
      userId: 'user-1',
      actionType: 'create',
      entityType: 'Supplier',
      entityId: 'supplier-1',
      afterJson: { name: 'Test Supplier' },
      notes: 'Created via API',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        actionType: 'create',
        entityType: 'Supplier',
        entityId: 'supplier-1',
      }),
    });
  });

  it('does not throw when the DB write fails — swallows the error silently', async () => {
    (prisma.auditLog.create as jest.Mock).mockRejectedValue(
      new Error('DB error'),
    );

    await expect(
      service.log({
        userId: 'u1',
        actionType: 'create',
        entityType: 'T',
        entityId: 'e1',
      }),
    ).resolves.toBeUndefined();
  });

  it('sets beforeJson and afterJson correctly when both are provided', async () => {
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
    const before = { name: 'Old' };
    const after = { name: 'New' };

    await service.log({
      userId: 'u1',
      actionType: 'update',
      entityType: 'Supplier',
      entityId: 's1',
      beforeJson: before,
      afterJson: after,
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ beforeJson: before, afterJson: after }),
    });
  });
});
