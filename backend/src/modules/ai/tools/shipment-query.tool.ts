import { PrismaService } from '../../../prisma/prisma.service';

export const shipmentTool = {
  name: 'get_shipment_summary',
  description: 'Get shipment status, transit times, delays, and shipping costs',
  input_schema: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        description:
          'Filter by status (draft, packed, in_transit, arrived, received)',
      },
      dateFrom: {
        type: 'string',
        description: 'Dispatch date from (ISO 8601)',
      },
      dateTo: { type: 'string', description: 'Dispatch date to (ISO 8601)' },
    },
  },
};

export async function shipmentQueryTool(
  prisma: PrismaService,
  input: { status?: string; dateFrom?: string; dateTo?: string },
): Promise<object> {
  const dateFilter: Record<string, unknown> = {};
  if (input.dateFrom) dateFilter.gte = new Date(input.dateFrom);
  if (input.dateTo) dateFilter.lte = new Date(input.dateTo);

  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;
  if (Object.keys(dateFilter).length > 0) where.dispatchDate = dateFilter;

  const shipments = await prisma.shipment.findMany({
    where,
    include: {
      costs: { select: { amountGbp: true, costType: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const result = shipments.map((s) => {
    const totalCostGbp = s.costs.reduce(
      (sum, c) => sum + Number(c.amountGbp),
      0,
    );
    const transitDays =
      s.dispatchDate && s.actualArrivalDate
        ? Math.round(
            (s.actualArrivalDate.getTime() - s.dispatchDate.getTime()) /
              86400000,
          )
        : s.dispatchDate && s.expectedArrivalDate
          ? Math.round(
              (s.expectedArrivalDate.getTime() - s.dispatchDate.getTime()) /
                86400000,
            )
          : null;
    const isDelayed =
      s.expectedArrivalDate &&
      !s.actualArrivalDate &&
      s.expectedArrivalDate < new Date();

    return {
      reference: s.shipmentReference,
      name: s.shipmentName,
      status: s.status,
      carrier: s.carrierName,
      dispatchDate: s.dispatchDate,
      expectedArrival: s.expectedArrivalDate,
      actualArrival: s.actualArrivalDate,
      transitDays,
      isDelayed,
      totalCostGbp: totalCostGbp.toFixed(2),
    };
  });

  const totalCost = result.reduce((sum, s) => sum + Number(s.totalCostGbp), 0);
  return {
    shipments: result,
    totalShipments: result.length,
    totalCostGbp: totalCost.toFixed(2),
  };
}
