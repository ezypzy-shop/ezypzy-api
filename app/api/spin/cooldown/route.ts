import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// GET /api/spin/cooldown - Check if user can spin (cooldown validation)
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

    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Check if user has spun in the last 24 hours
    const result = await sql`
      SELECT 
        spun_at,
        spun_at + INTERVAL '24 hours' as next_spin_time,
        NOW() as current_time,
        CASE 
          WHEN spun_at + INTERVAL '24 hours' > NOW() THEN false
          ELSE true
        END as can_spin
      FROM spin_history
      WHERE user_id = ${userIdInt}
      ORDER BY spun_at DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      // User has never spun - allow spinning
      return NextResponse.json({
        canSpin: true,
        lastSpinTime: null,
        nextSpinTime: null
      });
    }

    const spin = result[0];
    
    return NextResponse.json({
      canSpin: spin.can_spin,
      lastSpinTime: spin.spun_at,
      nextSpinTime: spin.next_spin_time
    });
  } catch (error) {
    console.error('Error checking spin cooldown:', error);
    return NextResponse.json(
      { error: 'Failed to check spin cooldown' },
      { status: 500 }
    );
  }
}
