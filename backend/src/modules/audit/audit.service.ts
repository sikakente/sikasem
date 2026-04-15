import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    userId: string;
    actionType: string;
    entityType: string;
    entityId: string;
    beforeJson?: object;
    afterJson?: object;
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

  async findAll(query: AuditQueryDto) {
    const {
      page = 1,
      limit = 20,
      entityType,
      actionType,
      userId,
      dateFrom,
      dateTo,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (entityType) where.entityType = entityType;
    if (actionType) where.actionType = actionType;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.actionTimestamp = {};
      if (dateFrom) where.actionTimestamp.gte = new Date(dateFrom);
      if (dateTo) where.actionTimestamp.lte = new Date(dateTo);
    }

    const [auditLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { actionTimestamp: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { auditLogs, total, page, limit };
  }
}
