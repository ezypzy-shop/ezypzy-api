import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get active (unused and not expired) codes for user from spin_codes table
    const result = await sql`
      SELECT * FROM spin_codes
      WHERE user_id = ${userId}
        AND used = false
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching spin codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active codes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
