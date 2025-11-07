import PDFDocument from 'pdfkit';

type ReceiptContext = {
  orderId: string;
  siteName: string;
  siteAddress: string;
  issuedAt: Date;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceCents: number;
    taxBand: string;
  }>;
  totals: {
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
  };
};

function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

export async function renderReceiptPdf(context: ReceiptContext): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50 });
  const buffers: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => {
      const concatenated = Buffer.concat(buffers as unknown as readonly Uint8Array<ArrayBufferLike>[]);
      resolve(concatenated as Buffer);
    });
    doc.on('error', (error) => reject(error));

    doc.fontSize(18).text(context.siteName, { align: 'left' });
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#475569').text(context.siteAddress);
    doc.moveDown(1.5);

    doc.fillColor('#0f172a').fontSize(16).text('Beleg', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Bestell-ID: ${context.orderId}`);
    doc.text(`Ausgestellt am: ${context.issuedAt.toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })}`);
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#0f172a');
    context.items.forEach((item) => {
      doc.text(item.description, { continued: true });
      doc.text(` x${item.quantity}`, { continued: true, align: 'right' });
      doc.text(formatCurrency(item.unitPriceCents * item.quantity), { align: 'right' });
      doc.fontSize(9).fillColor('#475569').text(`Steuersatz: ${item.taxBand}`, { continued: false });
      doc.moveDown(0.4);
      doc.fontSize(12).fillColor('#0f172a');
    });

    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Zwischensumme: ${formatCurrency(context.totals.subtotalCents)}`, { align: 'right' });
    doc.text(`Mehrwertsteuer: ${formatCurrency(context.totals.taxCents)}`, { align: 'right' });
    doc.fontSize(12).fillColor('#0f172a').text(`Total: ${formatCurrency(context.totals.totalCents)}`, { align: 'right' });

    doc.moveDown(1);
    doc.fontSize(9).fillColor('#475569').text('Vielen Dank für Ihren Einkauf bei Schnittwerk by Vanessa Carosella.');

    doc.end();
  });
}
