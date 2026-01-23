import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pushToken } = body;

    if (!userId || !pushToken) {
      return NextResponse.json(
        { error: 'userId and pushToken are required' },
        { status: 400 }
      );
    }

    // Update user's push token in the database
    const result = await sql`
      UPDATE users
      SET push_token = ${pushToken}
      WHERE id = ${userId}
      RETURNING id, push_token
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`✅ Push token saved for user ${userId}:`, pushToken);

    return NextResponse.json({
      success: true,
      message: 'Push token saved successfully',
    });
  } catch (error: any) {
    console.error('Error saving push token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save push token' },
      { status: 500 }
    );
  }
}
