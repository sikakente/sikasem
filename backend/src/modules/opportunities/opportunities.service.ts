import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { OpportunityQueryDto } from './dto/opportunity-query.dto';
import { runRestockRule } from './opportunity-rules/restock.rule';
import { runMarginRichRule } from './opportunity-rules/margin-rich.rule';
import { runSupplierSwitchRule } from './opportunity-rules/supplier-switch.rule';
import { runShipmentConsolidationRule } from './opportunity-rules/shipment-consolidation.rule';

interface CreateOrSkipParams {
  opportunityType: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  summary: string;
  recommendation?: string;
  score?: number;
}

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 * * * *')
  async runOpportunityDetection(): Promise<void> {
    this.logger.log('Running opportunity detection...');
    const results = await Promise.allSettled([
      runRestockRule(this.prisma, this),
      runMarginRichRule(this.prisma, this),
      runSupplierSwitchRule(this.prisma, this),
      runShipmentConsolidationRule(this.prisma, this),
    ]);
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error('Opportunity rule failed', result.reason);
      }
    }
    this.logger.log('Opportunity detection complete');
  }

  async createOrSkip(params: CreateOrSkipParams): Promise<void> {
    const existing = await this.prisma.opportunityRecord.findFirst({
      where: {
        opportunityType: params.opportunityType,
        relatedEntityType: params.relatedEntityType ?? null,
        relatedEntityId: params.relatedEntityId ?? null,
        status: 'open',
      },
    });

    if (existing) return;

    await this.prisma.opportunityRecord.create({
      data: {
        opportunityType: params.opportunityType,
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
        summary: params.summary,
        recommendation: params.recommendation,
        score: params.score,
        status: 'open',
      },
    });
  }

  async findAll(query: OpportunityQueryDto) {
    const { page = 1, limit = 20, opportunityType, status } = query;
    const where: Record<string, unknown> = {};
    if (opportunityType) where.opportunityType = opportunityType;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.opportunityRecord.findMany({
        where,
        orderBy: [{ score: 'desc' }, { detectedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.opportunityRecord.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findById(id: string) {
    const opp = await this.prisma.opportunityRecord.findUnique({
      where: { id },
    });
    if (!opp) throw new NotFoundException(`Opportunity ${id} not found`);
    return opp;
  }

  async updateStatus(id: string, status: string, _userId: string) {
    await this.findById(id);
    return this.prisma.opportunityRecord.update({
      where: { id },
      data: { status },
    });
  }
}
