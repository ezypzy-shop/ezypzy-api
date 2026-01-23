interface PushMessage {
  to: string; // Expo push token
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

/**
 * Send push notification using Expo Push Notification service
 */
export async function sendPushNotification(message: PushMessage) {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: message.to,
        title: message.title,
        body: message.body,
        data: message.data || {},
        sound: message.sound || 'default',
        badge: message.badge || 0,
        priority: message.priority || 'high',
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Push notification error:', result);
      throw new Error(`Failed to send push notification: ${JSON.stringify(result)}`);
    }

    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

/**
 * Send push notifications to multiple devices
 */
export async function sendBulkPushNotifications(messages: PushMessage[]) {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Bulk push notification error:', result);
      throw new Error(`Failed to send bulk notifications: ${JSON.stringify(result)}`);
    }

    return result;
  } catch (error) {
    console.error('Error sending bulk push notifications:', error);
    throw error;
  }
}
