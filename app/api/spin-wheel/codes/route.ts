import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// GET /api/spin-wheel/codes - Get user's spin codes for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const businessId = searchParams.get('businessId');

    if (!userId || !businessId) {
      return NextResponse.json(
        { error: 'Missing userId or businessId' },
        { status: 400 }
      );
    }

    // Fetch all spin codes for this user and business
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
      AND sc.business_id = ${parseInt(businessId)}
      ORDER BY sc.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      codes: codes || []
    });
  } catch (error: any) {
    console.error('Error fetching spin codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch codes', details: error.message },
      { status: 500 }
    );
  }
}
