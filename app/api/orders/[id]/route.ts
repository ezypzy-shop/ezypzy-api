import { NextRequest, NextResponse } from "next/server";
import sql from "../../utils/sql";
import { sendShippingUpdateEmail } from "../../utils/email";
import { sendPushToUser } from "../../utils/notifications";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    
    const orders = await sql`
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'product_id', oi.product_id,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'product_name', p.name,
                 'product_image', p.images
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.id = ${id}
      GROUP BY o.id
    `;

    if (orders.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(orders[0]);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    const { status, trackingUrl } = body;

    const result = await sql`
      UPDATE orders
      SET status = ${status}, 
          tracking_url = ${trackingUrl || null},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = result[0];

    // Send email and push notifications for status updates
    if (order.customer_email && order.customer_name) {
      // Send email notification
      await sendShippingUpdateEmail(
        order.customer_email,
        order.customer_name,
        order.order_number,
        status,
        trackingUrl
      );

      // Send push notification
      if (order.user_id) {
        let pushTitle = '📦 Order Update';
        let pushBody = `Your order ${order.order_number} has been updated.`;

        switch (status) {
          case 'processing':
            pushTitle = '⏳ Order Being Prepared';
            pushBody = `Your order ${order.order_number} is being prepared.`;
            break;
          case 'ready':
            pushTitle = '✅ Order Ready!';
            pushBody = `Your order ${order.order_number} is ready for pickup/delivery!`;
            break;
          case 'out_for_delivery':
            pushTitle = '🚚 Out for Delivery';
            pushBody = `Your order ${order.order_number} is on its way!`;
            break;
          case 'delivered':
            pushTitle = '🎉 Order Delivered!';
            pushBody = `Your order ${order.order_number} has been delivered. Enjoy!`;
            break;
          case 'completed':
            pushTitle = '✅ Order Completed';
            pushBody = `Thank you for your order! Order ${order.order_number} is now completed.`;
            break;
          case 'cancelled':
            pushTitle = '❌ Order Cancelled';
            pushBody = `Your order ${order.order_number} has been cancelled.`;
            break;
        }

        await sendPushToUser(order.user_id, pushTitle, pushBody, {
          orderId: id,
          type: 'order_update',
        });
      }
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
