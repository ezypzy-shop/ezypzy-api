import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

// Expo Push API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: any
) {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken[')) {
    console.log('Invalid Expo push token:', expoPushToken);
    return;
  }

  const message: PushMessage = {
    to: expoPushToken,
    title,
    body,
    data: data || {},
    sound: 'default',
    priority: 'high',
  };

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('✅ Push notification sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
  }
}

// Send push notification to specific user
export async function sendPushToUser(userId: number, title: string, body: string, data?: any) {
  try {
    // Get user's push token from database
    const users = await sql`
      SELECT push_token FROM users WHERE id = ${userId} AND push_token IS NOT NULL
    `;

    if (users.length === 0 || !users[0].push_token) {
      console.log('No push token found for user:', userId);
      return;
    }

    await sendPushNotification(users[0].push_token, title, body, data);
  } catch (error) {
    console.error('Error sending push to user:', error);
  }
}

// Send push notification to multiple users
export async function sendPushToMultipleUsers(
  userIds: number[],
  title: string,
  body: string,
  data?: any
) {
  try {
    // Get push tokens for all users
    const users = await sql`
      SELECT push_token FROM users 
      WHERE id = ANY(${userIds}) AND push_token IS NOT NULL
    `;

    if (users.length === 0) {
      console.log('No push tokens found for users:', userIds);
      return;
    }

    // Send to all users
    const promises = users.map(user => 
      sendPushNotification(user.push_token, title, body, data)
    );

    await Promise.all(promises);
    console.log(`✅ Push notifications sent to ${users.length} users`);
  } catch (error) {
    console.error('Error sending push to multiple users:', error);
  }
}

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
