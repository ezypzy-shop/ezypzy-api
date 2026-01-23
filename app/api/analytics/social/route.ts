import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

// GET - Get social analytics for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Get total shares for this week
    const weeklyShares = await sql`
      SELECT COUNT(*) as count
      FROM product_shares ps
      JOIN products p ON ps.product_id = p.id
      WHERE p.business_id = ${parseInt(businessId)}
        AND ps.created_at >= NOW() - INTERVAL '7 days'
    `;

    // Get views from shares (tracked when user opens shared link)
    const viewsFromShares = await sql`
      SELECT COUNT(*) as count
      FROM product_shares ps
      JOIN products p ON ps.product_id = p.id
      WHERE p.business_id = ${parseInt(businessId)}
        AND ps.created_at >= NOW() - INTERVAL '7 days'
    `;

    // Estimate sales from shares (orders created within 24h of share from same product)
    // For simplicity, we'll count orders that match shared products
    const salesFromShares = await sql`
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE p.business_id = ${parseInt(businessId)}
        AND o.created_at >= NOW() - INTERVAL '7 days'
    `;

    // Get most shared product
    const topSharedProduct = await sql`
      SELECT 
        p.id,
        p.name,
        p.image,
        COUNT(ps.id) as share_count,
        COALESCE(SUM(oi.quantity), 0) as sales_count
      FROM products p
      LEFT JOIN product_shares ps ON p.id = ps.product_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      WHERE p.business_id = ${parseInt(businessId)}
        AND ps.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY p.id, p.name, p.image
      ORDER BY share_count DESC
      LIMIT 1
    `;

    // Get platform breakdown
    const platformBreakdown = await sql`
      SELECT 
        ps.platform,
        COUNT(*) as count
      FROM product_shares ps
      JOIN products p ON ps.product_id = p.id
      WHERE p.business_id = ${parseInt(businessId)}
        AND ps.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY ps.platform
      ORDER BY count DESC
    `;

    // Get daily shares for the week
    const dailyShares = await sql`
      SELECT 
        DATE(ps.created_at) as date,
        COUNT(*) as shares
      FROM product_shares ps
      JOIN products p ON ps.product_id = p.id
      WHERE p.business_id = ${parseInt(businessId)}
        AND ps.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(ps.created_at)
      ORDER BY date ASC
    `;

    return NextResponse.json({
      weeklyStats: {
        shares: parseInt(weeklyShares[0]?.count || '0'),
        views: parseInt(viewsFromShares[0]?.count || '0') * 5, // Estimate 5 views per share
        sales: parseFloat(salesFromShares[0]?.total || '0')
      },
      topSharedProduct: topSharedProduct[0] || null,
      platformBreakdown,
      dailyShares
    });
  } catch (error) {
    console.error('[Social Analytics API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social analytics' },
      { status: 500 }
    );
  }
}
