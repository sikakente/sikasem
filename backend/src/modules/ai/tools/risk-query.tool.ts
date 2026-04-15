import { PrismaService } from '../../../prisma/prisma.service';

export const riskTool = {
  name: 'get_active_risks_and_alerts',
  description: 'Get current open risks, alerts, and opportunities',
  input_schema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function riskQueryTool(
  prisma: PrismaService,
  _input: Record<string, never>,
): Promise<object> {
  const [risks, alerts, opportunities] = await Promise.all([
    prisma.riskRecord.findMany({
      where: { status: { in: ['open', 'monitoring'] } },
      orderBy: { score: 'desc' },
      take: 10,
    }),
    prisma.alert.findMany({
      where: { severity: { in: ['high', 'critical'] }, status: 'open' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.opportunityRecord.findMany({
      where: { status: 'open' },
      orderBy: { score: 'desc' },
      take: 10,
    }),
  ]);

  return {
    risks: risks.map((r) => ({
      type: r.riskType,
      summary: r.summary,
      recommendation: r.recommendation,
      score: r.score,
      status: r.status,
    })),
    alerts: alerts.map((a) => ({
      type: a.alertType,
      severity: a.severity,
      title: a.title,
      message: a.message,
    })),
    opportunities: opportunities.map((o) => ({
      type: o.opportunityType,
      summary: o.summary,
      recommendation: o.recommendation,
      score: o.score,
    })),
  };
}
