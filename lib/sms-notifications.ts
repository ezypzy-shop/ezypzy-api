import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client only if credentials are provided
let twilioClient: ReturnType<typeof twilio> | null = null;

if (accountSid && authToken) {
  try {
    twilioClient = twilio(accountSid, authToken);
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error);
  }
}

interface SMSNotification {
  to: string; // Phone number in E.164 format (e.g., +1234567890)
  body: string;
}

/**
 * Send SMS notification via Twilio
 */
export async function sendSMS({ to, body }: SMSNotification): Promise<boolean> {
  // Check if Twilio is configured
  if (!twilioClient || !twilioPhoneNumber) {
    console.warn('⚠️ Twilio is not configured. SMS notifications are disabled.');
    console.log('To enable SMS, add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your .env file');
    return false;
  }

  // Validate phone number format (basic check)
  if (!to.startsWith('+')) {
    console.error('❌ Invalid phone number format. Must be in E.164 format (e.g., +1234567890)');
    return false;
  }

  try {
    const message = await twilioClient.messages.create({
      body,
      from: twilioPhoneNumber,
      to,
    });

    console.log(`✅ SMS sent to ${to}:`, message.sid);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${to}:`, error);
    return false;
  }
}

/**
 * Format phone number to E.164 format
 * Assumes US numbers if no country code is provided
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it starts with country code, return as is
  if (digits.length > 10 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If it's a 10-digit US number, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it's 11 digits and starts with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Return with + prefix
  return digits.startsWith('+') ? digits : `+${digits}`;
}

/**
 * Send order notification to customer via SMS
 */
export async function sendCustomerOrderSMS(
  customerPhone: string,
  orderNumber: string,
  status: string,
  customerName?: string
): Promise<boolean> {
  const formattedPhone = formatPhoneNumber(customerPhone);

  let message = '';

  if (status === 'pending') {
    message = `Hi${customerName ? ` ${customerName}` : ''}! Your order ${orderNumber} has been placed successfully. We'll notify you when it's confirmed. Track your order: https://app.ezypzy.shop/track-order`;
  } else if (status === 'confirmed') {
    message = `Good news! Your order ${orderNumber} has been confirmed and is being prepared. You'll receive updates as it progresses.`;
  } else if (status === 'preparing') {
    message = `Your order ${orderNumber} is now being prepared. It will be ready for ${status === 'preparing' ? 'pickup/delivery' : 'delivery'} soon!`;
  } else if (status === 'ready') {
    message = `Your order ${orderNumber} is ready! Please proceed to pick it up or wait for delivery.`;
  } else if (status === 'out_for_delivery') {
    message = `Your order ${orderNumber} is out for delivery! It should arrive soon.`;
  } else if (status === 'delivered') {
    message = `Your order ${orderNumber} has been delivered! Thank you for your order. We hope you enjoy it! 😊`;
  } else if (status === 'cancelled') {
    message = `Your order ${orderNumber} has been cancelled. If you have any questions, please contact support.`;
  } else {
    message = `Order ${orderNumber} status update: ${status}`;
  }

  return await sendSMS({
    to: formattedPhone,
    body: message,
  });
}

/**
 * Send new order notification to business via SMS
 */
export async function sendBusinessOrderSMS(
  businessPhone: string,
  orderNumber: string,
  customerName: string,
  totalAmount: number
): Promise<boolean> {
  const formattedPhone = formatPhoneNumber(businessPhone);

  const message = `🔔 New Order Received!\n\nOrder: ${orderNumber}\nCustomer: ${customerName}\nTotal: $${totalAmount.toFixed(2)}\n\nPlease log in to your dashboard to confirm and process this order.`;

  return await sendSMS({
    to: formattedPhone,
    body: message,
  });
}
