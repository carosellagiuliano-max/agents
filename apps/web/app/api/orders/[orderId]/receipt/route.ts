import { NextRequest, NextResponse } from 'next/server';

import { eq } from '@schnittwerk/db';

import { getDatabase } from '@/lib/db';
import { renderReceiptPdf } from '@/lib/pdf';

export async function GET(_request: NextRequest, { params }: { params: { orderId: string } }) {
  const db = getDatabase();
  const order = await db.query.orders.findFirst({
    where: (orders, { eq: eqOrder }) => eqOrder(orders.id, params.orderId),
    columns: {
      id: true,
      totalCents: true,
      taxCents: true,
      createdAt: true,
    },
    with: {
      items: {
        columns: {
          id: true,
          description: true,
          quantity: true,
          unitPriceCents: true,
          metadata: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const siteName = process.env.SITE_NAME ?? 'Schnittwerk by Vanessa Carosella';
  const siteAddress = process.env.SITE_ADDRESS ?? 'Rorschacher Str. 152, 9000 St. Gallen';

  const pdf = await renderReceiptPdf({
    orderId: order.id,
    siteName,
    siteAddress,
    issuedAt: order.createdAt ?? new Date(),
    items: order.items.map((item) => {
      const metadata = (item.metadata ?? {}) as Record<string, unknown>;
      const taxBand = typeof metadata.taxBand === 'string' ? metadata.taxBand : 'standard';
      return {
        description: item.description ?? 'Position',
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        taxBand,
      };
    }),
    totals: {
      subtotalCents: order.items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0),
      taxCents: order.taxCents,
      totalCents: order.totalCents,
    },
  });

  const body = Uint8Array.from(pdf);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receipt-${order.id}.pdf"`,
      'Content-Length': String(pdf.length),
    },
  });
}
