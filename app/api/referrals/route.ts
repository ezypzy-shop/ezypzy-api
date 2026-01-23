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

    // Get user's referral code
    const user = await sql`SELECT referral_code FROM users WHERE id = ${userId}`;
    
    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate referral code if user doesn't have one
    let referralCode = user[0].referral_code;
    if (!referralCode) {
      referralCode = `REF${userId}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await sql`UPDATE users SET referral_code = ${referralCode} WHERE id = ${userId}`;
    }

    // Get referrals made by this user (if referred_by column exists)
    let referrals: any[] = [];
    try {
      referrals = await sql`
        SELECT u.id, u.name as full_name, u.email, u.created_at
        FROM users u
        WHERE u.referred_by = ${referralCode}
        ORDER BY u.created_at DESC
      `;
    } catch (error) {
      // Column might not exist, return empty array
      console.log('referred_by column not available:', error);
    }

    return NextResponse.json({
      referralCode: referralCode,
      referrals: referrals,
      totalReferrals: referrals.length
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referrals', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, referralCode } = await request.json();

    if (!userId || !referralCode) {
      return NextResponse.json(
        { error: 'User ID and referral code are required' },
        { status: 400 }
      );
    }

    // Check if referral code exists
    const referrer = await sql`
      SELECT id FROM users WHERE referral_code = ${referralCode}
    `;

    if (referrer.length === 0) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 400 }
      );
    }

    // Check if user already used a referral code
    const user = await sql`
      SELECT referred_by FROM users WHERE id = ${userId}
    `;

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user[0].referred_by) {
      return NextResponse.json(
        { error: 'You have already used a referral code' },
        { status: 400 }
      );
    }

    // Update user with referral code
    await sql`
      UPDATE users
      SET referred_by = ${referralCode}
      WHERE id = ${userId}
    `;

    // Award coins to both users
    await sql`
      UPDATE users
      SET coins = COALESCE(coins, 0) + 100
      WHERE id = ${userId} OR id = ${referrer[0].id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Referral code applied successfully! Both you and your referrer received 100 coins.'
    });
  } catch (error) {
    console.error('Error applying referral code:', error);
    return NextResponse.json(
      { error: 'Failed to apply referral code', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
