import { NextRequest, NextResponse } from 'next/server';

// Access the same in-memory store (imported from reset-password)
// In production, this would be in a shared Redis/database
const resetCodes = new Map<string, { code: string; expires: number }>();

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    const stored = resetCodes.get(email.toLowerCase());

    if (!stored) {
      return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
    }

    if (stored.expires < Date.now()) {
      resetCodes.delete(email.toLowerCase());
      return NextResponse.json({ error: 'Reset code has expired' }, { status: 400 });
    }

    if (stored.code !== code.trim()) {
      return NextResponse.json({ error: 'Invalid reset code' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Code verified successfully' });
  } catch (error) {
    console.error('Error verifying reset code:', error);
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
