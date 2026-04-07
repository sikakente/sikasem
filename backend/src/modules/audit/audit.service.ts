import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    userId: string;
    actionType: string;
    entityType: string;
    entityId: string;
    beforeJson?: Record<string, unknown>;
    afterJson?: Record<string, unknown>;
    notes?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          actionType: params.actionType,
          entityType: params.entityType,
          entityId: params.entityId,
          beforeJson: params.beforeJson as Prisma.InputJsonValue | undefined,
          afterJson: params.afterJson as Prisma.InputJsonValue | undefined,
          notes: params.notes,
        },
      });
    } catch {
      // Fire-and-forget — never throw if audit fails
    }
  }
}
