import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, businessId } = body;

    if (!code || !businessId) {
      return NextResponse.json(
        { error: 'Code and business ID are required' },
        { status: 400 }
      );
    }

    // Check if code exists and is valid for this business
    const result = await sql`
      SELECT sc.*, b.business_name
      FROM spin_codes sc
      LEFT JOIN businesses b ON sc.business_id = b.id
      WHERE sc.code = ${code}
        AND sc.business_id = ${businessId}
        AND sc.used = false
        AND sc.expires_at > NOW()
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired code for this business' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      discount: result[0].discount_amount,
      code: result[0].code,
      businessName: result[0].business_name
    });
  } catch (error: any) {
    console.error('[Spin Validate API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to validate code' },
      { status: 500 }
    );
  }
}
