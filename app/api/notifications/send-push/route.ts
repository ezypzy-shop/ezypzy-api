import { NextRequest, NextResponse } from 'next/server';
import { sendPushToUser, sendPushToMultipleUsers } from '../../utils/notifications';

// API endpoint for sending push notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userIds, title, body: messageBody, data } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    if (userId) {
      // Send to single user
      await sendPushToUser(userId, title, messageBody, data);
      return NextResponse.json({ success: true, message: 'Push notification sent to user' });
    } else if (userIds && Array.isArray(userIds)) {
      // Send to multiple users
      await sendPushToMultipleUsers(userIds, title, messageBody, data);
      return NextResponse.json({ 
        success: true, 
        message: `Push notifications sent to ${userIds.length} users` 
      });
    } else {
      return NextResponse.json(
        { error: 'Either userId or userIds is required' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error in push notification endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send push notification' },
      { status: 500 }
    );
  }
}
