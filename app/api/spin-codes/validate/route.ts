import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

// POST /api/spin-codes/validate - Validate and get discount code details
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Fetch the code and validate it (works for ALL businesses since business_id can be NULL)
    const codes = await sql`
      SELECT *
      FROM spin_codes
      WHERE code = ${code.trim().toUpperCase()}
      AND used = false
      AND expires_at > NOW()
    `;

    if (codes.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid or expired code',
        valid: false 
      }, { status: 400 });
    }

    const codeData = codes[0];

    return NextResponse.json({
      valid: true,
      code: codeData.code,
      discount_amount: codeData.discount_amount,
      expires_at: codeData.expires_at,
    });
  } catch (error: any) {
    console.error('Error validating spin code:', error);
    return NextResponse.json({ error: error.message || 'Failed to validate code' }, { status: 500 });
  }
}
