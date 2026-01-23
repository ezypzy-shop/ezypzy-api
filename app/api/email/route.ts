import { NextRequest, NextResponse } from 'next/server';
import { sendShippingUpdateEmail } from '../utils/email';

// API endpoint for manual email testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...emailData } = body;

    if (type === 'shipping_update') {
      await sendShippingUpdateEmail(
        emailData.customerEmail,
        emailData.customerName,
        emailData.orderNumber,
        emailData.status,
        emailData.trackingUrl
      );
      return NextResponse.json({ success: true, message: 'Shipping update email sent' });
    }

    return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
