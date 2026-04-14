import { XlsxExporter } from './xlsx.exporter';
import { ColumnDef } from '../types';
import * as ExcelJS from 'exceljs';

describe('XlsxExporter', () => {
  const columns: ColumnDef[] = [
    { header: 'Product', key: 'product' },
    { header: 'Qty', key: 'qty' },
  ];
  const exporter = new XlsxExporter();

  it('returns a Buffer with XLSX magic bytes (PK zip signature)', async () => {
    const buf = await exporter.export(columns, [], 'Sheet1');
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K
  });

  it('resulting workbook contains a sheet with the correct name', async () => {
    const buf = await exporter.export(columns, [], 'My Report');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as any);
    expect(wb.getWorksheet('My Report')).toBeDefined();
  });

  it('first row of the sheet contains column headers in bold', async () => {
    const buf = await exporter.export(columns, [{ product: 'Rice', qty: 10 }], 'Report');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as any);
    const ws = wb.getWorksheet('Report')!;
    const headerRow = ws.getRow(1);
    expect(headerRow.getCell(1).value).toBe('Product');
    expect(headerRow.getCell(1).font?.bold).toBe(true);
  });
});
