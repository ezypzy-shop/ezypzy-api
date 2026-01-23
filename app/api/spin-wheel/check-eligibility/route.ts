import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, businessId } = body;

    if (!userId || !businessId) {
      return NextResponse.json(
        { error: 'User ID and Business ID are required' },
        { status: 400 }
      );
    }

    // Check if business has spin enabled
    const business = await sql`
      SELECT spin_wheel_enabled, name
      FROM businesses
      WHERE id = ${businessId}
    `;

    if (business.length === 0 || !business[0].spin_wheel_enabled) {
      return NextResponse.json({
        eligible: false,
        reason: 'Spin wheel not available for this business'
      });
    }

    // Check if user spun in last 1 minute (TESTING MODE)
    const lastSpin = await sql`
      SELECT created_at 
      FROM user_spins 
      WHERE user_id = ${userId} 
        AND business_id = ${businessId}
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (lastSpin.length > 0) {
      const lastSpinTime = new Date(lastSpin[0].created_at);
      const now = new Date();
      const minutesSinceLastSpin = (now.getTime() - lastSpinTime.getTime()) / (1000 * 60);

      // TESTING: 1 minute cooldown instead of 24 hours
      if (minutesSinceLastSpin < 1) {
        const nextSpinTime = new Date(lastSpinTime.getTime() + 1 * 60 * 1000);
        return NextResponse.json({
          eligible: false,
          reason: `You already spun at ${business[0].name} recently!`,
          nextSpinTime: nextSpinTime.toISOString()
        });
      }
    }

    return NextResponse.json({
      eligible: true,
      businessName: business[0].name
    });
  } catch (error: any) {
    console.error('[Spin Eligibility API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}
