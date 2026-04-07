import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogParams {
  userId: string;
  actionType: 'create' | 'update' | 'delete' | 'void' | 'refund' | 'adjust';
  entityType: string;
  entityId: string;
  beforeJson?: object;
  afterJson?: object;
  notes?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          actionType: params.actionType,
          entityType: params.entityType,
          entityId: params.entityId,
          beforeJson: params.beforeJson ?? undefined,
          afterJson: params.afterJson ?? undefined,
          notes: params.notes,
        },
      });
    } catch {
      // Fire-and-forget — never throw if audit fails
    }
  }
}
