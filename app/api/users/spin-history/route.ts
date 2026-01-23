import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || searchParams.get('user_id');
    const businessId = searchParams.get('businessId') || searchParams.get('business_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Build query based on filters
    let query;
    if (businessId) {
      // Get all spin codes for this user at this specific business
      query = sql`
        SELECT 
          sc.*,
          b.business_name,
          b.logo
        FROM spin_codes sc
        LEFT JOIN businesses b ON sc.business_id = b.id
        WHERE sc.user_id = ${userId}
          AND sc.business_id = ${businessId}
        ORDER BY sc.created_at DESC
      `;
    } else {
      // Get all spin codes for this user across all businesses
      query = sql`
        SELECT 
          sc.*,
          b.business_name,
          b.logo
        FROM spin_codes sc
        LEFT JOIN businesses b ON sc.business_id = b.id
        WHERE sc.user_id = ${userId}
        ORDER BY sc.created_at DESC
      `;
    }

    const result = await query;

    // Add status to each code for easier frontend handling
    const codesWithStatus = result.map((code: any) => {
      let status = 'active';
      const now = new Date();
      const expiresAt = new Date(code.expires_at);
      
      if (code.used) {
        status = 'used';
      } else if (expiresAt < now) {
        status = 'expired';
      }

      return {
        ...code,
        status,
      };
    });

    return NextResponse.json(codesWithStatus);
  } catch (error) {
    console.error('Error fetching spin history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spin history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
