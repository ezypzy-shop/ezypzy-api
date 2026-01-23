import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Get summary - no commission, just sales
    const summary = await sql`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_sales,
        0 as total_commission,
        COALESCE(SUM(total), 0) as net_earnings,
        0 as avg_commission_rate
      FROM orders
      WHERE business_id = ${businessId}
      AND status IN ('Delivered', 'Completed')
    `;

    // Get monthly data (last 6 months) - no commission
    const monthlyCommission = await sql`
      SELECT 
        TO_CHAR(created_at, 'Mon YYYY') as month,
        COALESCE(SUM(total), 0) as sales,
        0 as commission,
        COALESCE(SUM(total), 0) as earnings
      FROM orders
      WHERE business_id = ${businessId}
      AND status IN ('Delivered', 'Completed')
      AND created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC
    `;

    return NextResponse.json({
      summary: summary[0] || {
        total_orders: 0,
        total_sales: 0,
        total_commission: 0,
        net_earnings: 0,
        avg_commission_rate: 0
      },
      monthlyCommission
    });
  } catch (error: any) {
    console.error('Error fetching commission data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commission data', details: error.message },
      { status: 500 }
    );
  }
}
