import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🧪 TEST SENDGRID - Starting test...');
  
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    console.log('🧪 SendGrid API Key:', process.env.SENDGRID_API_KEY ? 'Present' : 'Missing');
    console.log('🧪 From Email:', process.env.FROM_EMAIL);

    const msg = {
      to: 'ashok@fullsend.io',
      from: process.env.FROM_EMAIL!,
      subject: '🧪 Test Email from EzyPzy Shop',
      text: 'This is a test email to verify SendGrid is working.',
      html: '<strong>This is a test email to verify SendGrid is working.</strong>',
    };

    console.log('🧪 Sending test email...', msg);
    
    const response = await sgMail.send(msg);
    console.log('✅ SendGrid response:', JSON.stringify(response, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent!',
      response 
    });
  } catch (error: any) {
    console.error('❌ SendGrid error:', error);
    console.error('❌ Error body:', error.response?.body);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: error.response?.body 
    }, { status: 500 });
  }
}
