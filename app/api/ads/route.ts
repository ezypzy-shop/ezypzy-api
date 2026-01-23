import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');

    let result;

    if (businessId && status === 'active') {
      // Filter by business ID and active status
      result = await sql`
        SELECT a.*, b.business_name
        FROM ads a
        LEFT JOIN businesses b ON a.business_id = b.id
        WHERE a.business_id = ${businessId}
          AND a.is_active = true
          AND a.end_date > NOW()
        ORDER BY a.created_at DESC
      `;
    } else if (businessId) {
      // Filter by business ID only
      result = await sql`
        SELECT a.*, b.business_name
        FROM ads a
        LEFT JOIN businesses b ON a.business_id = b.id
        WHERE a.business_id = ${businessId}
        ORDER BY a.created_at DESC
      `;
    } else if (status === 'active') {
      // Filter by active status only
      result = await sql`
        SELECT a.*, b.business_name
        FROM ads a
        LEFT JOIN businesses b ON a.business_id = b.id
        WHERE a.is_active = true
          AND a.end_date > NOW()
        ORDER BY a.created_at DESC
      `;
    } else {
      // No filters - get all ads
      result = await sql`
        SELECT a.*, b.business_name
        FROM ads a
        LEFT JOIN businesses b ON a.business_id = b.id
        ORDER BY a.created_at DESC
      `;
    }

    return NextResponse.json(result, {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error fetching ads:', error);
    // CRITICAL: Always return valid JSON with 200 status to prevent HTML error pages
    return NextResponse.json(
      { error: 'Failed to fetch ads', ads: [], details: error instanceof Error ? error.message : String(error) },
      { 
        status: 200,
        headers: corsHeaders 
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      business_id,
      title,
      description,
      image,
      link_url,
      position = 'banner',
      start_date,
      end_date,
      is_active = true
    } = body;

    // Validate required fields
    if (!business_id || !title || !image) {
      return NextResponse.json(
        { error: 'Business ID, title, and image are required' },
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const result = await sql`
      INSERT INTO ads (
        business_id,
        title,
        description,
        image,
        link_url,
        position,
        start_date,
        end_date,
        is_active,
        total_views,
        total_clicks,
        created_at
      )
      VALUES (
        ${business_id},
        ${title},
        ${description || ''},
        ${image},
        ${link_url || ''},
        ${position},
        ${start_date || new Date()},
        ${end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)},
        ${is_active},
        0,
        0,
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { 
      status: 201,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error creating ad:', error);
    return NextResponse.json(
      { error: 'Failed to create ad' },
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}
