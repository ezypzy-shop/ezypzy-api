import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const toEmail = searchParams.get('email');

  if (!toEmail) {
    return NextResponse.json({ error: 'Please provide ?email=your@email.com' }, { status: 400 });
  }

  const config = {
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasFromEmail: !!process.env.FROM_EMAIL,
    fromEmail: process.env.FROM_EMAIL,
    toEmail,
  };

  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) {
    return NextResponse.json({ 
      success: false,
      error: 'Resend not configured',
      config 
    }, { status: 500 });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Ezypzy Shop <${process.env.FROM_EMAIL}>`,
        to: toEmail,
        subject: 'Test Email from Ezypzy Shop',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Test Email</h1><p>This is a test email to verify Resend is working correctly.</p><p>✅ If you received this, email notifications are working!</p></div>',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ 
        success: true,
        message: 'Test email sent successfully!',
        config,
        sentTo: toEmail,
        resendResponse: data,
      });
    } else {
      return NextResponse.json({ 
        success: false,
        error: 'Failed to send email',
        details: data,
        config,
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message,
      config,
    }, { status: 500 });
  }
}
