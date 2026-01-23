import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if user spun in the last 24 hours
    const lastSpin = await sql`
      SELECT created_at 
      FROM user_spins 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (lastSpin.length === 0) {
      return NextResponse.json({
        canSpin: true,
        nextSpinTime: null
      });
    }

    const lastSpinTime = new Date(lastSpin[0].created_at);
    const now = new Date();
    const hoursSinceLastSpin = (now.getTime() - lastSpinTime.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastSpin >= 24) {
      return NextResponse.json({
        canSpin: true,
        nextSpinTime: null
      });
    }

    const nextSpinTime = new Date(lastSpinTime.getTime() + 24 * 60 * 60 * 1000);

    return NextResponse.json({
      canSpin: false,
      nextSpinTime: nextSpinTime.toISOString(),
      lastSpinTime: lastSpinTime.toISOString()
    });
  } catch (error: any) {
    console.error('Error checking cooldown:', error);
    return NextResponse.json(
      { error: 'Failed to check cooldown' },
      { status: 500 }
    );
  }
}
