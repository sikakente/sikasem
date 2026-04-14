import { CsvExporter } from './csv.exporter';
import { ColumnDef } from '../types';

describe('CsvExporter', () => {
  const columns: ColumnDef[] = [
    { header: 'Name', key: 'name' },
    { header: 'Amount', key: 'amount', format: (v) => Number(v).toFixed(2) },
  ];
  const exporter = new CsvExporter();

  it('produces a header row matching column definitions', () => {
    const csv = exporter.export(columns, []).toString('utf-8');
    expect(csv.startsWith('Name,Amount')).toBe(true);
  });

  it('escapes cell values containing commas by wrapping in quotes', () => {
    const rows = [{ name: 'Apples, Pears', amount: 10 }];
    const csv = exporter.export(columns, rows).toString('utf-8');
    expect(csv).toContain('"Apples, Pears"');
  });

  it('escapes cell values containing double-quotes by doubling the quote character', () => {
    const rows = [{ name: 'He said "hello"', amount: 5 }];
    const csv = exporter.export(columns, rows).toString('utf-8');
    expect(csv).toContain('"He said ""hello"""');
  });

  it('returns one data row per item plus the header', () => {
    const rows = [
      { name: 'A', amount: 1 },
      { name: 'B', amount: 2 },
    ];
    const csv = exporter.export(columns, rows).toString('utf-8');
    const lines = csv.split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(3);
  });
});
