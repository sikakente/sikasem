import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RiskQueryDto } from './dto/risk-query.dto';
import { runStockoutRiskRule } from './risk-rules/stockout-risk.rule';
import { runShipmentDelayPatternRule } from './risk-rules/shipment-delay-pattern.rule';
import { runMarginCompressionRule } from './risk-rules/margin-compression.rule';
import { runSupplierConcentrationRule } from './risk-rules/supplier-concentration.rule';

interface CreateOrSkipParams {
  riskType: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  summary: string;
  recommendation?: string;
  score?: number;
}

@Injectable()
export class RisksService {
  private readonly logger = new Logger(RisksService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 * * * *')
  async runRiskDetection(): Promise<void> {
    this.logger.log('Running risk detection...');
    const results = await Promise.allSettled([
      runStockoutRiskRule(this.prisma, this),
      runShipmentDelayPatternRule(this.prisma, this),
      runMarginCompressionRule(this.prisma, this),
      runSupplierConcentrationRule(this.prisma, this),
    ]);
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error('Risk rule failed', result.reason);
      }
    }
    this.logger.log('Risk detection complete');
  }

  async createOrSkip(params: CreateOrSkipParams): Promise<void> {
    const existing = await this.prisma.riskRecord.findFirst({
      where: {
        riskType: params.riskType,
        relatedEntityType: params.relatedEntityType ?? null,
        relatedEntityId: params.relatedEntityId ?? null,
        status: { in: ['open', 'monitoring'] },
      },
    });

    if (existing) return;

    await this.prisma.riskRecord.create({
      data: {
        riskType: params.riskType,
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
        summary: params.summary,
        recommendation: params.recommendation,
        score: params.score,
        status: 'open',
      },
    });
  }

  async findAll(query: RiskQueryDto) {
    const { page = 1, limit = 20, riskType, status } = query;
    const where: Record<string, unknown> = {};
    if (riskType) where.riskType = riskType;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.riskRecord.findMany({
        where,
        orderBy: [{ score: 'desc' }, { detectedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.riskRecord.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findById(id: string) {
    const risk = await this.prisma.riskRecord.findUnique({ where: { id } });
    if (!risk) throw new NotFoundException(`Risk ${id} not found`);
    return risk;
  }

  async updateStatus(id: string, status: string, _userId: string) {
    await this.findById(id);
    return this.prisma.riskRecord.update({
      where: { id },
      data: { status },
    });
  }
}
