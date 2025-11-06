import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { db, schema } from '@schnittwerk/db';
import { eq } from 'drizzle-orm';
import { formatCurrency, calculateTaxBreakdown, SwissTaxRate } from '@schnittwerk/payments';

interface ReceiptData {
  orderId: string;
  receiptNumber: string;
  date: Date;
  customer: {
    name: string;
    email: string;
    address?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: SwissTaxRate;
    total: number;
  }>;
  subtotal: number;
  taxBreakdown: Array<{
    rate: SwissTaxRate;
    net: number;
    tax: number;
  }>;
  total: number;
  paymentMethod: string;
  isCashPayment: boolean;
}

/**
 * Generate a Swiss-compliant receipt PDF
 * Includes all required elements per Swiss law:
 * - Company information
 * - Receipt number and date
 * - Customer information
 * - Itemized list with tax breakdown
 * - Payment method
 * - QR code for digital verification
 */
export async function generateReceiptPDF(orderId: string): Promise<Buffer> {
  // Fetch order data
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
    with: {
      customer: true,
      orderItems: {
        with: {
          productVariant: {
            with: {
              product: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Prepare receipt data
  const receiptData: ReceiptData = {
    orderId: order.id,
    receiptNumber: `R-${order.orderNumber}`,
    date: order.createdAt,
    customer: {
      name: `${order.customer?.firstName} ${order.customer?.lastName}`,
      email: order.customer?.email || '',
      address: order.shippingAddress || undefined,
    },
    items: order.orderItems.map((item) => ({
      description: item.productVariant?.product?.name || item.name,
      quantity: item.quantity,
      unitPrice: item.priceAtPurchase,
      taxRate: item.taxRate as SwissTaxRate,
      total: item.totalPrice,
    })),
    subtotal: order.subtotal,
    taxBreakdown: calculateTaxBreakdownFromOrder(order),
    total: order.totalAmount,
    paymentMethod: order.payments?.[0]?.method || 'unknown',
    isCashPayment: order.payments?.[0]?.method === 'cash',
  };

  return createPDF(receiptData);
}

/**
 * Generate a refund receipt PDF
 */
export async function generateRefundReceiptPDF(refundId: string): Promise<Buffer> {
  // Fetch refund data
  const refund = await db.query.refunds.findFirst({
    where: eq(schema.refunds.id, refundId),
    with: {
      payment: {
        with: {
          order: {
            with: {
              customer: true,
              orderItems: true,
            },
          },
        },
      },
    },
  });

  if (!refund) {
    throw new Error(`Refund ${refundId} not found`);
  }

  const order = refund.payment?.order;
  if (!order) {
    throw new Error(`Order not found for refund ${refundId}`);
  }

  // Prepare refund receipt data
  const receiptData: ReceiptData = {
    orderId: order.id,
    receiptNumber: `RF-${order.orderNumber}`,
    date: refund.createdAt,
    customer: {
      name: `${order.customer?.firstName} ${order.customer?.lastName}`,
      email: order.customer?.email || '',
    },
    items: order.orderItems.map((item) => ({
      description: item.name,
      quantity: item.quantity,
      unitPrice: -item.priceAtPurchase, // Negative for refund
      taxRate: item.taxRate as SwissTaxRate,
      total: -item.totalPrice,
    })),
    subtotal: -order.subtotal,
    taxBreakdown: calculateTaxBreakdownFromOrder(order, true), // true = refund (negative)
    total: -refund.amount,
    paymentMethod: refund.payment?.method || 'unknown',
    isCashPayment: false,
  };

  return createPDF(receiptData, true); // true = isRefund
}

/**
 * Create the actual PDF document
 */
async function createPDF(data: ReceiptData, isRefund = false): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header - Company Information
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Schnittwerk by Vanessa Carosella', { align: 'center' });

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Rorschacher Str. 152, 9000 St. Gallen, Schweiz', { align: 'center' })
        .text(`E-Mail: ${process.env.SITE_EMAIL || 'info@schnittwerk-vanessa.ch'}`, {
          align: 'center',
        })
        .text(`Tel: ${process.env.SITE_PHONE || '+41 71 XXX XX XX'}`, { align: 'center' })
        .moveDown(2);

      // Receipt Title
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(isRefund ? 'Rückerstattungsbeleg' : 'Kassenbeleg', { align: 'center' })
        .moveDown();

      // Receipt Number and Date
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Belegnummer: ${data.receiptNumber}`, { align: 'left' })
        .text(
          `Datum: ${data.date.toLocaleDateString('de-CH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}`
        )
        .moveDown();

      // Customer Information
      if (data.customer.name && data.customer.name.trim() !== '') {
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Kunde:', { continued: false })
          .font('Helvetica')
          .text(data.customer.name)
          .text(data.customer.email);

        if (data.customer.address) {
          doc.text(data.customer.address);
        }
        doc.moveDown();
      }

      // Line separator
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown();

      // Items Table Header
      const tableTop = doc.y;
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Artikel', 50, tableTop, { width: 200, continued: false })
        .text('Menge', 250, tableTop, { width: 50, align: 'right' })
        .text('Preis', 310, tableTop, { width: 70, align: 'right' })
        .text('MwSt', 390, tableTop, { width: 50, align: 'right' })
        .text('Total', 450, tableTop, { width: 95, align: 'right' });

      doc.moveDown(0.5);

      // Items
      let yPosition = doc.y;
      doc.font('Helvetica').fontSize(9);

      data.items.forEach((item) => {
        const taxPercentage = parseFloat(item.taxRate.replace('_', '.'));

        doc
          .text(item.description, 50, yPosition, { width: 200, continued: false })
          .text(item.quantity.toString(), 250, yPosition, { width: 50, align: 'right' })
          .text(formatCurrency(item.unitPrice), 310, yPosition, { width: 70, align: 'right' })
          .text(`${taxPercentage}%`, 390, yPosition, { width: 50, align: 'right' })
          .text(formatCurrency(item.total), 450, yPosition, { width: 95, align: 'right' });

        yPosition = doc.y + 5;

        // Add new page if needed
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });

      doc.moveDown();

      // Line separator
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown();

      // Subtotal and Tax Breakdown
      const summaryX = 350;
      let summaryY = doc.y;

      doc.fontSize(9).font('Helvetica');
      doc.text('Zwischensumme (Netto):', summaryX, summaryY, { width: 100 });
      doc.text(formatCurrency(data.subtotal), summaryX + 100, summaryY, {
        width: 95,
        align: 'right',
      });
      summaryY += 15;

      // Tax breakdown by rate
      data.taxBreakdown.forEach((taxItem) => {
        const taxPercentage = parseFloat(taxItem.rate.replace('_', '.'));
        doc.text(`MwSt ${taxPercentage}%:`, summaryX, summaryY, { width: 100 });
        doc.text(formatCurrency(taxItem.tax), summaryX + 100, summaryY, {
          width: 95,
          align: 'right',
        });
        summaryY += 15;
      });

      // Total
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Gesamtbetrag:', summaryX, summaryY, { width: 100 })
        .text(formatCurrency(data.total), summaryX + 100, summaryY, { width: 95, align: 'right' });

      doc.moveDown(2);

      // Payment Method
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(`Zahlungsart: ${translatePaymentMethod(data.paymentMethod)}`, { align: 'left' });

      // Cash rounding note if applicable
      if (data.isCashPayment) {
        doc
          .fontSize(8)
          .text('Bargeldbeträge werden auf 5 Rappen gerundet.', { align: 'left', italics: true });
      }

      doc.moveDown(2);

      // QR Code for digital verification
      const qrUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.schnittwerk-vanessa.ch'}/receipt/${data.orderId}`;

      QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'M', width: 150 })
        .then((qrDataUrl) => {
          const qrY = doc.y;
          doc.image(qrDataUrl, 50, qrY, { width: 80, height: 80 });

          doc
            .fontSize(8)
            .text('Scannen Sie den QR-Code für', 140, qrY, { width: 200 })
            .text('digitale Verifizierung', 140, qrY + 12, { width: 200 })
            .text(`Beleg-ID: ${data.receiptNumber}`, 140, qrY + 30, { width: 200, color: '#666' });

          doc.moveDown(5);

          // Footer
          doc
            .fontSize(8)
            .font('Helvetica')
            .text('Vielen Dank für Ihren Besuch bei Schnittwerk!', 50, doc.page.height - 100, {
              align: 'center',
            })
            .text('Bei Fragen wenden Sie sich bitte an unseren Kundenservice.', { align: 'center' })
            .text(
              `© ${new Date().getFullYear()} Schnittwerk by Vanessa Carosella. Alle Rechte vorbehalten.`,
              { align: 'center', color: '#999' }
            );

          doc.end();
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Calculate tax breakdown from order
 */
function calculateTaxBreakdownFromOrder(
  order: any,
  isRefund = false
): Array<{
  rate: SwissTaxRate;
  net: number;
  tax: number;
}> {
  const breakdown = new Map<string, { net: number; tax: number }>();

  order.orderItems.forEach((item: any) => {
    const rate = item.taxRate as SwissTaxRate;
    const taxPercentage = parseFloat(rate.replace('_', '.')) / 100;

    const net = item.priceAtPurchase * item.quantity;
    const tax = net * taxPercentage;

    const existing = breakdown.get(rate) || { net: 0, tax: 0 };
    breakdown.set(rate, {
      net: existing.net + net,
      tax: existing.tax + tax,
    });
  });

  const result = Array.from(breakdown.entries()).map(([rate, values]) => ({
    rate: rate as SwissTaxRate,
    net: isRefund ? -values.net : values.net,
    tax: isRefund ? -values.tax : values.tax,
  }));

  return result;
}

/**
 * Translate payment method to German
 */
function translatePaymentMethod(method: string): string {
  const translations: Record<string, string> = {
    card: 'Karte',
    cash: 'Bargeld',
    bank_transfer: 'Banküberweisung',
    sumup: 'SumUp',
    stripe: 'Stripe',
    terminal: 'Terminal',
  };

  return translations[method] || method;
}

/**
 * Send receipt via email
 */
export async function sendReceiptEmail(
  orderId: string,
  customerEmail: string,
  isRefund = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const pdfBuffer = isRefund
      ? await generateRefundReceiptPDF(orderId)
      : await generateReceiptPDF(orderId);

    // TODO: Integrate with Resend to send email with PDF attachment
    // This requires the Resend API which is already set up in the email service

    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return { success: false, error: 'Email service not configured' };
    }

    const subject = isRefund
      ? 'Rückerstattungsbeleg - Schnittwerk'
      : 'Ihr Kassenbeleg - Schnittwerk';

    const result = await resend.emails.send({
      from: `${process.env.SITE_NAME || 'Schnittwerk'} <${process.env.SITE_EMAIL || 'info@schnittwerk-vanessa.ch'}>`,
      to: customerEmail,
      subject,
      html: `
        <h2>${isRefund ? 'Rückerstattungsbeleg' : 'Ihr Kassenbeleg'}</h2>
        <p>Sehr geehrte/r Kunde/Kundin,</p>
        <p>anbei finden Sie ${isRefund ? 'Ihren Rückerstattungsbeleg' : 'Ihren Kassenbeleg'} als PDF.</p>
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        <p>Mit freundlichen Grüssen<br/>
        Ihr Schnittwerk-Team</p>
        <hr/>
        <p style="font-size: 12px; color: #666;">
        Schnittwerk by Vanessa Carosella<br/>
        Rorschacher Str. 152, 9000 St. Gallen<br/>
        ${process.env.SITE_EMAIL || 'info@schnittwerk-vanessa.ch'}
        </p>
      `,
      attachments: [
        {
          filename: isRefund ? 'ruckerstattung.pdf' : 'kassenbeleg.pdf',
          content: pdfBuffer,
        },
      ],
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send receipt email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
