import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }

    // Mark the code as used
    const result = await sql`
      UPDATE spin_codes
      SET used = true, used_at = NOW()
      WHERE code = ${code}
        AND used = false
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Code not found or already used' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Code marked as used'
    });
  } catch (error: any) {
    console.error('[Spin Mark Used API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to mark code as used' },
      { status: 500 }
    );
  }
}
