import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id'); // Changed from 'userId' to match client
    const businessId = searchParams.get('business_id'); // Changed from 'businessId' to match client

    // Return all notifications if both userId and businessId are provided
    if (userId && businessId) {
      const result = await sql`
        SELECT * FROM notifications
        WHERE user_id = ${userId} OR business_id = ${businessId}
        ORDER BY created_at DESC
        LIMIT 100
      `;
      return NextResponse.json(result);
    }

    // Return user notifications
    if (userId) {
      const result = await sql`
        SELECT * FROM notifications
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 50
      `;
      return NextResponse.json(result);
    }

    // Return business notifications
    if (businessId) {
      const result = await sql`
        SELECT * FROM notifications
        WHERE business_id = ${businessId}
        ORDER BY created_at DESC
        LIMIT 50
      `;
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Either user_id or business_id is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, business_id, order_id, title, message, type = 'info' } = body;

    if ((!user_id && !business_id) || !title || !message) {
      return NextResponse.json(
        { error: 'Either user_id or business_id is required, along with title and message' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO notifications (user_id, business_id, order_id, title, message, type, is_read, created_at)
      VALUES (${user_id || null}, ${business_id || null}, ${order_id || null}, ${title}, ${message}, ${type}, false, NOW())
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const markAll = searchParams.get('markAll');
    const userId = searchParams.get('user_id'); // Changed from 'userId' to match client
    const businessId = searchParams.get('business_id'); // Changed from 'businessId' to match client

    // Mark single notification as read
    if (id) {
      const result = await sql`
        UPDATE notifications SET is_read = true WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json(result[0]);
    }

    // Mark all notifications as read for user or business
    if (markAll === 'true') {
      if (userId && businessId) {
        await sql`
          UPDATE notifications SET is_read = true 
          WHERE user_id = ${userId} OR business_id = ${businessId}
        `;
      } else if (userId) {
        await sql`
          UPDATE notifications SET is_read = true WHERE user_id = ${userId}
        `;
      } else if (businessId) {
        await sql`
          UPDATE notifications SET is_read = true WHERE business_id = ${businessId}
        `;
      } else {
        return NextResponse.json(
          { error: 'Either user_id or business_id is required' },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Either id or markAll=true is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
