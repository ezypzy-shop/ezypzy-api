import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../utils/sql';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const adId = parseInt(id);
    
    if (isNaN(adId)) {
      return NextResponse.json(
        { error: 'Invalid ad ID' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Increment views counter
    await sql`
      UPDATE ads 
      SET views = COALESCE(views, 0) + 1
      WHERE id = ${adId}
    `;

    return NextResponse.json({ success: true }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('Error tracking view:', error);
    return NextResponse.json(
      { error: 'Failed to track view', details: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}
