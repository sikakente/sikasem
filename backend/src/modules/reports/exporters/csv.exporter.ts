import { ColumnDef } from '../types';

export class CsvExporter {
  export(columns: ColumnDef[], rows: Record<string, unknown>[]): Buffer {
    const escape = (raw: unknown): string => {
      let val = String(raw ?? '');
      if (val.includes('"')) val = val.replace(/"/g, '""');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`;
      }
      return val;
    };

    const header = columns.map((c) => escape(c.header)).join(',');
    const lines = rows.map((row) =>
      columns
        .map((c) => {
          const raw = row[c.key];
          const formatted = c.format ? c.format(raw) : (raw ?? '');
          return escape(formatted);
        })
        .join(','),
    );

    return Buffer.from([header, ...lines].join('\r\n'), 'utf-8');
  }
}
