import { ColumnDef } from '../types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

export class PdfExporter {
  export(
    title: string,
    columns: ColumnDef[],
    rows: Record<string, unknown>[],
    summary?: Record<string, unknown>,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title and date
      doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(new Date().toLocaleDateString(), { align: 'center' });
      doc.moveDown(1);

      // Column layout: equal widths across page
      const pageWidth = 515; // 595 - 2*40 margins
      const colWidth = Math.max(50, Math.floor(pageWidth / columns.length));

      // Header row
      doc.font('Helvetica-Bold').fontSize(9);
      let headerY = doc.y;
      columns.forEach((col, i) => {
        doc.text(col.header, 40 + i * colWidth, headerY, {
          width: colWidth - 4,
          lineBreak: false,
        });
      });
      doc.moveDown(0.7);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.3);

      // Data rows
      doc.font('Helvetica').fontSize(8);
      for (const row of rows) {
        if (doc.y > 750) {
          doc.addPage();
          // Reprint header on new page
          doc.font('Helvetica-Bold').fontSize(9);
          headerY = doc.y;
          columns.forEach((col, i) => {
            doc.text(col.header, 40 + i * colWidth, headerY, {
              width: colWidth - 4,
              lineBreak: false,
            });
          });
          doc.moveDown(0.7);
          doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
          doc.moveDown(0.3);
          doc.font('Helvetica').fontSize(8);
        }

        const rowY = doc.y;
        columns.forEach((col, i) => {
          const raw = row[col.key];
          const val = col.format ? col.format(raw) : String(raw ?? '');
          doc.text(val, 40 + i * colWidth, rowY, {
            width: colWidth - 4,
            lineBreak: false,
          });
        });
        doc.moveDown(0.5);
      }

      // Summary section
      if (summary && Object.keys(summary).length > 0) {
        doc.moveDown(1);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(9).text('Summary');
        doc.font('Helvetica').fontSize(9);
        for (const [key, val] of Object.entries(summary)) {
          doc.text(`${key}: ${String(val)}`);
        }
      }

      doc.end();
    });
  }
}
