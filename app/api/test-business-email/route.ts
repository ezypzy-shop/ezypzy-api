import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@ezypzy.shop';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'EzyPzy Shop';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessEmail, orderNumber } = body;

    console.log('='.repeat(60));
    console.log('🧪 BUSINESS EMAIL TEST');
    console.log('='.repeat(60));
    console.log('Target email:', businessEmail);
    console.log('Order number:', orderNumber);
    console.log('SendGrid configured:', !!SENDGRID_API_KEY);
    console.log('From email:', SENDGRID_FROM_EMAIL);

    if (!SENDGRID_API_KEY) {
      return NextResponse.json({ 
        error: 'SendGrid not configured',
        details: 'SENDGRID_API_KEY is not set'
      }, { status: 500 });
    }

    if (!businessEmail) {
      return NextResponse.json({ 
        error: 'Business email required'
      }, { status: 400 });
    }

    const emailContent = {
      to: businessEmail,
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME
      },
      subject: `🔔 New Order Received - ${orderNumber || 'TEST-ORDER'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 40px; border-radius: 12px;">
            <h1 style="color: #f97316; font-size: 28px; margin-bottom: 20px;">🔔 New Order Received!</h1>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #111827;">Order Number: ${orderNumber || 'TEST-ORDER'}</h2>
              <p style="color: #6b7280;">This is a test email to verify that business owner notifications are working correctly.</p>
            </div>
            
            <div style="background: #fff7ed; padding: 16px; border-radius: 8px; border-left: 4px solid #f97316;">
              <p style="color: #92400e; margin: 0; font-weight: 600;">
                ✅ If you're seeing this email, business owner notifications are working!
              </p>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px; text-align: center;">
              Test email from ${SENDGRID_FROM_NAME}
            </p>
          </div>
        </body>
        </html>
      `,
    };

    console.log('📧 Attempting to send email...');
    console.log('Email config:', {
      to: emailContent.to,
      from: emailContent.from,
      subject: emailContent.subject
    });

    const result = await sgMail.send(emailContent);

    console.log('✅ Email sent successfully!');
    console.log('SendGrid response:', {
      statusCode: result[0].statusCode,
      headers: result[0].headers
    });
    console.log('='.repeat(60));

    return NextResponse.json({ 
      success: true,
      message: 'Test email sent successfully',
      statusCode: result[0].statusCode,
      messageId: result[0].headers['x-message-id']
    });

  } catch (error: any) {
    console.error('='.repeat(60));
    console.error('❌ ERROR SENDING EMAIL');
    console.error('='.repeat(60));
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error response:', error?.response?.body);
    console.error('='.repeat(60));

    return NextResponse.json({ 
      error: 'Failed to send email',
      details: error.message,
      response: error?.response?.body
    }, { status: 500 });
  }
}
