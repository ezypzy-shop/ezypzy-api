import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// GET /api/spin-wheel/all-codes - Get all spin codes for a user across all businesses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Fetch all spin codes for this user across all businesses
    const codes = await sql`
      SELECT 
        sc.id,
        sc.code,
        sc.discount_amount,
        sc.expires_at,
        sc.used,
        b.business_name
      FROM spin_codes sc
      JOIN businesses b ON sc.business_id = b.id
      WHERE sc.user_id = ${parseInt(userId)}
      ORDER BY sc.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      codes: codes || []
    });
  } catch (error: any) {
    console.error('Error fetching all spin codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch codes', details: error.message },
      { status: 500 }
    );
  }
}
