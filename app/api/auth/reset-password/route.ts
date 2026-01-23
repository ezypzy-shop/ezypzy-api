import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// Simple in-memory store for reset codes (in production, use Redis or database)
const resetCodes = new Map<string, { code: string; expires: number }>();

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendPasswordResetEmail(email: string, name: string, code: string) {
  const fromEmail = process.env.FROM_EMAIL || 'ashokmittal919@gmail.com';
  
  const msg = {
    to: email,
    from: fromEmail,
    subject: 'Password Reset Code - EzyPzy Shop',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🔐 Password Reset</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 600;">Hi ${name || 'there'},</h2>
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      We received a request to reset your password. Use the code below to reset your password:
                    </p>
                  </td>
                </tr>
                
                <!-- Reset Code -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;" align="center">
                    <table cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; border-radius: 8px; padding: 20px;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-align: center;">Your Reset Code:</p>
                          <h1 style="margin: 0; color: #3B82F6; font-size: 36px; font-weight: 700; letter-spacing: 8px; text-align: center;">${code}</h1>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Instructions -->
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px;">
                        ⏰ <strong>This code expires in 15 minutes.</strong>
                      </p>
                    </div>
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                      If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                      Need help? Contact our support team
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      © ${new Date().getFullYear()} EzyPzy Shop. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Password reset email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const users = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email})`;
    
    if (users.length === 0) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({ 
        message: 'If this email exists, a reset code has been sent' 
      });
    }

    const user = users[0];

    // Generate 6-digit code
    const code = generateResetCode();
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Store reset code
    resetCodes.set(email.toLowerCase(), { code, expires });

    // Send email with reset code
    try {
      await sendPasswordResetEmail(email, user.full_name || user.name, code);
    } catch (emailError) {
      console.error('Failed to send email, but returning success for security');
    }
    
    // For demo purposes, log the code
    console.log('======================');
    console.log('PASSWORD RESET CODE');
    console.log('Email:', email);
    console.log('Code:', code);
    console.log('Valid for 15 minutes');
    console.log('======================');

    return NextResponse.json({ 
      message: 'Reset code sent to your email',
      // FOR DEMO ONLY - remove in production
      demo_code: code 
    });
  } catch (error) {
    console.error('Error sending reset code:', error);
    return NextResponse.json({ error: 'Failed to send reset code' }, { status: 500 });
  }
}
