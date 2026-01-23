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
      SELECT * FROM spin_history
      WHERE user_id = ${parseInt(userId)}
      AND DATE(spun_at) = CURRENT_DATE
      ORDER BY spun_at DESC
      LIMIT 1
    `;

    return NextResponse.json({
      hasSpunToday: result.length > 0,
      lastSpin: result.length > 0 ? result[0] : null
    });
  } catch (error) {
    console.error('Error checking spin status:', error);
    return NextResponse.json(
      { error: 'Failed to check spin status' },
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

    // Convert userId to number
    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Check if user has already spun today
    const existingSpin = await sql`
      SELECT * FROM spin_history
      WHERE user_id = ${userIdInt}
      AND DATE(spun_at) = CURRENT_DATE
    `;

    if (existingSpin.length > 0) {
      return NextResponse.json(
        { error: 'You have already spun today. Come back tomorrow!' },
        { status: 400 }
      );
    }

    // Generate random reward
    const rewards = [
      { type: 'discount', value: 5, label: '5% Off' },
      { type: 'discount', value: 10, label: '10% Off' },
      { type: 'discount', value: 15, label: '15% Off' },
      { type: 'discount', value: 20, label: '20% Off' },
      { type: 'discount', value: 25, label: '25% Off' },
      { type: 'coins', value: 50, label: '50 Coins' },
      { type: 'coins', value: 100, label: '100 Coins' },
      { type: 'none', value: 0, label: 'Better Luck Next Time' }
    ];

    const randomReward = rewards[Math.floor(Math.random() * rewards.length)];

    // Generate discount code if discount reward
    let discountCode = null;
    if (randomReward.type === 'discount') {
      discountCode = `SPIN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    }

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Save spin result
    const result = await sql`
      INSERT INTO spin_history (
        user_id, 
        prize_type, 
        prize_value, 
        discount_code,
        spun_at,
        expires_at,
        used
      )
      VALUES (
        ${userIdInt}, 
        ${randomReward.type}, 
        ${randomReward.value.toString()},
        ${discountCode},
        NOW(),
        ${expiresAt.toISOString()},
        false
      )
      RETURNING *
    `;

    // If coins reward, update user's coin balance
    if (randomReward.type === 'coins') {
      await sql`
        UPDATE users
        SET coins = COALESCE(coins, 0) + ${randomReward.value}
        WHERE id = ${userIdInt}
      `;
    }

    return NextResponse.json({
      success: true,
      reward: {
        ...randomReward,
        code: discountCode,
        expiresAt: expiresAt.toISOString(),
        spin: result[0]
      }
    });
  } catch (error) {
    console.error('Error processing spin:', error);
    return NextResponse.json(
      { error: 'Failed to process spin' },
      { status: 500 }
    );
  }
}
