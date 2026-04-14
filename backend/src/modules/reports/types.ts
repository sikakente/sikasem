import { PrismaService } from '../../prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';

export interface ColumnDef {
  header: string;
  key: string;
  format?: (value: unknown) => string;
}

export interface ReportDefinition {
  title: string;
  columns: ColumnDef[];
  query(
    params: ReportQueryDto,
    prisma: PrismaService,
  ): Promise<Record<string, unknown>[]>;
  summary?(rows: Record<string, unknown>[]): Record<string, unknown>;
}
