import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user has already spun today
    const result = await sql`
      SELECT * FROM spin_wheel_history
      WHERE user_id = ${userId}
      AND DATE(created_at) = CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 1
    `;

    return NextResponse.json({
      hasSpunToday: result.length > 0,
      lastSpin: result.length > 0 ? result[0] : null
    });
  } catch (error) {
    console.error('Error checking spin wheel status:', error);
    return NextResponse.json(
      { error: 'Failed to check spin wheel status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user has already spun today
    const existingSpin = await sql`
      SELECT * FROM spin_wheel_history
      WHERE user_id = ${userId}
      AND DATE(created_at) = CURRENT_DATE
    `;

    if (existingSpin.length > 0) {
      return NextResponse.json(
        { error: 'You have already spun today' },
        { status: 400 }
      );
    }

    // Generate unique code
    const code = `EZY${Date.now()}${Math.floor(Math.random() * 10000)}`;

    // Generate random discount (5% to 25%)
    const discount = Math.floor(Math.random() * 5) * 5 + 5; // 5, 10, 15, 20, 25

    // Save spin result
    const result = await sql`
      INSERT INTO spin_wheel_history (user_id, code, discount, used, created_at)
      VALUES (${userId}, ${code}, ${discount}, false, NOW())
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      code,
      discount,
      spin: result[0]
    });
  } catch (error) {
    console.error('Error processing spin wheel:', error);
    return NextResponse.json(
      { error: 'Failed to process spin wheel' },
      { status: 500 }
    );
  }
}
