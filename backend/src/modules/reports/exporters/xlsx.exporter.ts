import * as ExcelJS from 'exceljs';
import { ColumnDef } from '../types';

export class XlsxExporter {
  async export(
    columns: ColumnDef[],
    rows: Record<string, unknown>[],
    sheetName: string,
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);

    const headerRow = ws.addRow(columns.map((c) => c.header));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    for (const row of rows) {
      ws.addRow(
        columns.map((c) => {
          const raw = row[c.key];
          return c.format ? c.format(raw) : (raw ?? '');
        }),
      );
    }

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }
}
