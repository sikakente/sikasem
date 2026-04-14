import { ReportDefinition } from '../types';
import { ReportQueryDto } from '../dto/report-query.dto';
import { PrismaService } from '../../../prisma/prisma.service';

export const StockMovementReport: ReportDefinition = {
  title: 'Stock Movement Report',
  columns: [
    { header: 'Date', key: 'date' },
    { header: 'Product', key: 'product' },
    { header: 'Movement Type', key: 'movementType' },
    { header: 'Quantity', key: 'quantity', format: (v) => Number(v).toFixed(2) },
    { header: 'From Location', key: 'fromLocation' },
    { header: 'To Location', key: 'toLocation' },
    { header: 'Reference', key: 'reference' },
    { header: 'User', key: 'user' },
  ],

  async query(params: ReportQueryDto, prisma: PrismaService) {
    const dateWhere: Record<string, unknown> = {};
    if (params.dateFrom) dateWhere.gte = new Date(params.dateFrom);
    if (params.dateTo) dateWhere.lte = new Date(params.dateTo);

    const limit = params.limit ?? 100;
    const page = params.page ?? 1;

    const movements = await prisma.inventoryMovement.findMany({
      where: {
        ...(Object.keys(dateWhere).length > 0 ? { movementDate: dateWhere } : {}),
        ...(params.locationId
          ? { OR: [{ fromLocationId: params.locationId }, { toLocationId: params.locationId }] }
          : {}),
      },
      include: {
        product: true,
        fromLocation: true,
        toLocation: true,
        createdByUser: true,
      },
      orderBy: { movementDate: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return movements.map((m) => ({
      date: m.movementDate.toISOString().split('T')[0],
      product: m.product.name,
      movementType: m.movementType,
      quantity: Number(m.quantity),
      fromLocation: m.fromLocation?.name ?? '',
      toLocation: m.toLocation?.name ?? '',
      reference: m.referenceId ? `${m.referenceType}:${m.referenceId}` : '',
      user: m.createdByUser.fullName,
    }));
  },
};
