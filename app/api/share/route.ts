import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function POST(request: NextRequest) {
  try {
    const { userId, entityType, entityId } = await request.json();

    if (!userId || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'User ID, entity type, and entity ID are required' },
        { status: 400 }
      );
    }

    // Record share
    const result = await sql`
      INSERT INTO shares (user_id, entity_type, entity_id, created_at)
      VALUES (${userId}, ${entityType}, ${entityId}, NOW())
      RETURNING *
    `;

    // Award coins for sharing (if not already awarded today)
    const today = new Date().toISOString().split('T')[0];
    const recentShares = await sql`
      SELECT COUNT(*) as count FROM shares
      WHERE user_id = ${userId}
      AND DATE(created_at) = ${today}
    `;

    if (parseInt(recentShares[0].count) <= 3) {
      // Award 10 coins for first 3 shares per day
      await sql`
        UPDATE users
        SET coins = COALESCE(coins, 0) + 10
        WHERE id = ${userId}
      `;
    }

    return NextResponse.json({
      success: true,
      share: result[0],
      coinsAwarded: parseInt(recentShares[0].count) <= 3 ? 10 : 0
    });
  } catch (error) {
    console.error('Error recording share:', error);
    return NextResponse.json(
      { error: 'Failed to record share' },
      { status: 500 }
    );
  }
}
