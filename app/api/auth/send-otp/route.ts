import { NextRequest, NextResponse } from 'next/server';
import { otpStore } from '@/lib/otp-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with timestamp
    otpStore.set(phone, {
      otp,
      createdAt: Date.now(),
    });

    console.log(`📱 OTP generated for ${phone}: ${otp}`);

    // In production, send OTP via SMS service (Twilio, etc.)
    // For now, we'll return it in development mode
    const isDevelopment = process.env.NODE_ENV !== 'production';

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      ...(isDevelopment && { _debug: { otp } }), // Include OTP in response for testing
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
