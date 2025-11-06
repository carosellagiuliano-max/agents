import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger, getRequestId } from '@/lib/logger';
import { generateReceiptPDF, sendReceiptEmail } from '@/lib/services/receipt';

export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
  const requestId = getRequestId(request.headers);
  const logger = createRequestLogger(requestId);

  try {
    const { orderId } = params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';
    const email = searchParams.get('email');

    logger.info('Generating receipt', { orderId, download, email });

    // If email parameter is provided, send via email
    if (email) {
      const result = await sendReceiptEmail(orderId, email);

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Receipt sent via email',
        });
      } else {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
      }
    }

    // Generate PDF
    const pdfBuffer = await generateReceiptPDF(orderId);

    logger.info('Receipt generated successfully', { orderId, size: pdfBuffer.length });

    // Return PDF as download or inline
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': download
          ? `attachment; filename="kassenbeleg-${orderId}.pdf"`
          : 'inline',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error('Failed to generate receipt', { error, orderId: params.orderId });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate receipt',
      },
      { status: 500 }
    );
  }
}
