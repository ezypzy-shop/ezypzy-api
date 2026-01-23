import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Support both orderNumber (camelCase) and order_number (snake_case) for backwards compatibility
    const orderNumber = searchParams.get('orderNumber') || searchParams.get('order_number');
    
    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
    }
    
    // Find order by order number (case insensitive)
    const orders = await sql`
      SELECT o.*, b.business_name, b.image as business_image, b.user_id as business_owner_id
      FROM orders o
      LEFT JOIN businesses b ON o.business_id = b.id
      WHERE UPPER(o.order_number) = UPPER(${orderNumber})
      LIMIT 1
    `;
    
    if (orders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    const order = orders[0];
    
    // Fetch order items
    const items = await sql`
      SELECT * FROM order_items WHERE order_id = ${order.id}
    `;
    order.items = items;
    
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error tracking order:', error);
    return NextResponse.json({ error: 'Failed to track order' }, { status: 500 });
  }
}
