import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // TODO: In production, you would:
    // 1. Send OTP via SMS service (Twilio, AWS SNS, etc.)
    // 2. Store OTP in database with expiration time
    // 3. Return success without exposing the OTP
    
    // For development/testing, we'll return the OTP
    console.log(`📱 OTP for ${phone}: ${otp}`);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      // Only include OTP in development for testing
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });

  } catch (error) {
    console.error('❌ Send OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
