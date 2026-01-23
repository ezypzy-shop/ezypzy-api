import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message, orderId } = await request.json();

    // Validate input
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Save to database
    const result = await sql`
      INSERT INTO contact_messages (name, email, subject, message, order_id, created_at)
      VALUES (${name}, ${email}, ${subject || null}, ${message}, ${orderId || null}, NOW())
      RETURNING *
    `;

    // Try to send email notification to admin if SendGrid is configured
    if (SENDGRID_API_KEY && process.env.ADMIN_EMAIL) {
      try {
        await sgMail.send({
          to: process.env.ADMIN_EMAIL,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@ezypzy.shop',
          subject: `New Contact Message: ${subject || 'No Subject'}`,
          text: `Name: ${name}\nEmail: ${email}\nOrder ID: ${orderId || 'N/A'}\n\nMessage:\n${message}`,
          html: `
            <h2>New Contact Message</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Order ID:</strong> ${orderId || 'N/A'}</p>
            <h3>Message:</h3>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: result[0]
    });
  } catch (error) {
    console.error('Error saving contact message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
