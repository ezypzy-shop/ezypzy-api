import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

// POST /api/spin-codes/mark-used - Mark a discount code as used
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Mark the code as used
    const result = await sql`
      UPDATE spin_codes
      SET used = true, used_at = NOW()
      WHERE code = ${code.trim().toUpperCase()}
      AND used = false
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Code not found or already used' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking code as used:', error);
    return NextResponse.json({ error: error.message || 'Failed to mark code as used' }, { status: 500 });
  }
}
