import { NextRequest, NextResponse } from 'next/server';
import { otpStore, OTP_VALIDITY } from '@/lib/otp-store';
import sql from '@/app/api/utils/sql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp, action } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Get stored OTP
    const storedData = otpStore.get(phone);

    if (!storedData) {
      return NextResponse.json(
        { error: 'OTP not found or expired. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    const now = Date.now();
    if (now - storedData.createdAt > OTP_VALIDITY) {
      otpStore.delete(phone);
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP. Please check and try again.' },
        { status: 400 }
      );
    }

    // OTP verified successfully - delete it
    otpStore.delete(phone);

    console.log(`✅ OTP verified successfully for ${phone}`);

    // If this is a sign-in action, fetch the user from the database
    if (action === 'sign-in') {
      const result = await sql`
        SELECT id, name, email, phone, login_method, is_business_user
        FROM users
        WHERE phone = ${phone}
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'No account found with this phone number. Please sign up first.' },
          { status: 404 }
        );
      }

      const user = result[0];

      console.log(`✅ User found for sign-in: ${user.phone}`);

      return NextResponse.json({
        success: true,
        message: 'OTP verified and signed in successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          login_method: user.login_method,
          is_business_user: user.is_business_user,
        },
      });
    }

    // For sign-up or other actions, just return success without user data
    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}
