import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || body.user_id;
    const businessId = body.businessId || body.business_id;

    console.log('[Spin API] Request:', { userId, businessId });

    if (!userId) {
      return NextResponse.json(
        { error: 'Please login or create an account to spin the wheel' },
        { status: 401 }
      );
    }

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Get business info and check if spin is enabled
    const business = await sql`
      SELECT id, name, spin_wheel_enabled, spin_discounts
      FROM businesses
      WHERE id = ${businessId}
    `;

    if (business.length === 0) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (!business[0].spin_wheel_enabled) {
      return NextResponse.json(
        { error: 'Spin wheel is not enabled for this business' },
        { status: 400 }
      );
    }

    // Check if user spun for THIS BUSINESS in the last 1 minute (TESTING MODE)
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
        return NextResponse.json(
          { 
            error: `You already spun at ${business[0].name} recently! Wait 1 minute for another spin.`,
            nextSpinTime: nextSpinTime.toISOString()
          },
          { status: 400 }
        );
      }
    }

    // Get spin discounts configured by the business
    let rewards = [10, 20, 50, 100, 200, 500]; // Default
    
    if (business[0].spin_discounts && Array.isArray(business[0].spin_discounts) && business[0].spin_discounts.length > 0) {
      rewards = business[0].spin_discounts.map((d: any) => parseInt(d)).filter((d: number) => !isNaN(d) && d > 0);
    }

    const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
    const code = `SPIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // TESTING: Code expires in 1 minute instead of 24 hours
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 1);

    console.log('[Spin API] Generated:', { reward: randomReward, code, businessId });

    // Save the spin
    await sql`
      INSERT INTO user_spins (user_id, business_id, discount_amount, created_at)
      VALUES (${userId}, ${businessId}, ${randomReward}, NOW())
    `;

    // Save the code (specific to this business)
    await sql`
      INSERT INTO spin_codes (code, discount_amount, business_id, expires_at, created_at, user_id, used)
      VALUES (${code}, ${randomReward}, ${businessId}, ${expiresAt.toISOString()}, NOW(), ${userId}, false)
    `;

    return NextResponse.json({
      success: true,
      reward: {
        amount: randomReward,
        label: `₹${randomReward} OFF`,
        code: code,
        businessName: business[0].name,
        expiresAt: expiresAt.toISOString()
      }
    });
  } catch (error: any) {
    console.error('[Spin API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to spin wheel. Please try again.' },
      { status: 500 }
    );
  }
}
