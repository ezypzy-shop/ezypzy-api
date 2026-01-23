import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const resetCodes = new Map<string, { code: string; expires: number }>();

async function sendPasswordChangedEmail(email: string, name: string) {
  const fromEmail = process.env.FROM_EMAIL || 'ashokmittal919@gmail.com';
  
  const msg = {
    to: email,
    from: fromEmail,
    subject: 'Password Changed Successfully - EzyPzy Shop',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">✅ Password Changed</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 600;">Hi ${name || 'there'},</h2>
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Your password has been successfully changed. You can now use your new password to sign in to your account.
                    </p>
                    
                    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin: 30px 0;">
                      <p style="margin: 0; color: #065f46; font-size: 14px;">
                        🔐 <strong>Security Tip:</strong> Keep your password secure and never share it with anyone.
                      </p>
                    </div>
                    
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin: 20px 0;">
                      <p style="margin: 0; color: #991b1b; font-size: 14px;">
                        ⚠️ If you didn't make this change, please contact our support team immediately.
                      </p>
                    </div>
                    
                    <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      Changed at: <strong>${new Date().toLocaleString()}</strong>
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
    console.log(`✅ Password changed email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending password changed email:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, code, new_password } = await request.json();

    if (!email || !code || !new_password) {
      return NextResponse.json({ error: 'Email, code, and new password are required' }, { status: 400 });
    }

    if (new_password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Verify code one more time
    const stored = resetCodes.get(email.toLowerCase());

    if (!stored || stored.code !== code.trim() || stored.expires < Date.now()) {
      return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
    }

    // Get user info for email
    const users = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email})`;
    const user = users[0];

    // Update password in database (plain text)
    await sql`
      UPDATE users 
      SET password_hash = ${new_password}, updated_at = NOW()
      WHERE LOWER(email) = LOWER(${email})
    `;

    // Remove used reset code
    resetCodes.delete(email.toLowerCase());

    // Send confirmation email
    try {
      await sendPasswordChangedEmail(email, user?.full_name || user?.name);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    console.log('Password updated successfully for:', email);

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
