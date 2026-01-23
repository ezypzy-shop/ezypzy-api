import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@ezypzy.shop';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'EzyPzy Shop';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Helper function to send shipping update emails
export async function sendShippingUpdateEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  status: string,
  trackingUrl?: string
) {
  if (!SENDGRID_API_KEY) {
    console.log('SendGrid not configured, skipping email');
    return;
  }

  let statusEmoji = '📦';
  let statusTitle = 'Order Update';
  let statusMessage = `Your order ${orderNumber} has been updated.`;
  let statusColor = '#f97316';

  switch (status) {
    case 'processing':
      statusEmoji = '⏳';
      statusTitle = 'Order Being Prepared';
      statusMessage = `Your order ${orderNumber} is being prepared with care.`;
      statusColor = '#eab308';
      break;
    case 'ready':
      statusEmoji = '✅';
      statusTitle = 'Order Ready!';
      statusMessage = `Great news! Your order ${orderNumber} is ready for pickup/delivery.`;
      statusColor = '#22c55e';
      break;
    case 'out_for_delivery':
      statusEmoji = '🚚';
      statusTitle = 'Out for Delivery';
      statusMessage = `Your order ${orderNumber} is on its way to you!`;
      statusColor = '#3b82f6';
      break;
    case 'delivered':
      statusEmoji = '🎉';
      statusTitle = 'Order Delivered!';
      statusMessage = `Your order ${orderNumber} has been successfully delivered. Enjoy!`;
      statusColor = '#22c55e';
      break;
    case 'completed':
      statusEmoji = '✅';
      statusTitle = 'Order Completed';
      statusMessage = `Thank you for your order! Order ${orderNumber} is now completed.`;
      statusColor = '#22c55e';
      break;
    case 'cancelled':
      statusEmoji = '❌';
      statusTitle = 'Order Cancelled';
      statusMessage = `Your order ${orderNumber} has been cancelled.`;
      statusColor = '#ef4444';
      break;
  }

  const emailContent = {
    to: customerEmail,
    from: {
      email: SENDGRID_FROM_EMAIL,
      name: SENDGRID_FROM_NAME
    },
    subject: `${statusTitle} - ${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); padding: 40px 20px; text-align: center;">
            <div style="font-size: 60px; margin-bottom: 16px;">${statusEmoji}</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${statusTitle}</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">${statusMessage}</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px 20px;">
            <p style="color: #111827; font-size: 16px; margin: 0 0 24px 0;">Hi ${customerName},</p>
            
            <!-- Order Number -->
            <div style="background: #fff7ed; border: 2px solid #fed7aa; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <div style="color: #f97316; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px;">ORDER NUMBER</div>
              <div style="color: #111827; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">${orderNumber}</div>
            </div>

            ${trackingUrl ? `
              <div style="text-align: center; margin: 24px 0;">
                <a href="${trackingUrl}" style="display: inline-block; background: ${statusColor}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                  Track Your Order
                </a>
              </div>
            ` : ''}

            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px; margin-top: 24px;">
              <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.6;">
                ${status === 'delivered' 
                  ? '💚 Thank you for choosing us! We hope you enjoy your order.' 
                  : '💡 You can track your order status anytime in the app.'}
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0; text-align: center;">
              Questions? We're here to help!
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This email was sent by ${SENDGRID_FROM_NAME}
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await sgMail.send(emailContent);
    console.log(`✅ Shipping update email sent to ${customerEmail}`);
  } catch (error: any) {
    console.error('❌ Error sending shipping update email:', error);
    console.error('❌ Error response:', error?.response?.body);
  }
}

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
