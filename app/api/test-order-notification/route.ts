import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const businessOwnerEmail = 'ashokmittal919@gmail.com';
  const customerEmail = 'customer@example.com';
  
  // Simulate order data
  const mockOrder = {
    order_number: 'TEST-' + Date.now(),
    total_amount: 1299.00,
    payment_method: 'cod',
    payment_status: 'pending',
    customer_name: 'Test Customer',
    customer_email: customerEmail,
    customer_phone: '+91 1234567890',
    items: [
      { product_name: 'Sample Product 1', quantity: 2, price: 499.00 },
      { product_name: 'Sample Product 2', quantity: 1, price: 301.00 },
    ],
    business_name: 'Ashok Premium Store',
    shipping_address: {
      street: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India'
    }
  };

  const businessEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">🎉 New Order Received!</h1>
      <p>Hi Business Owner,</p>
      <p>You have received a new order for <strong>${mockOrder.business_name}</strong>!</p>
      
      <div style="background: #f0f9ff; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #0066cc;">
        <h2 style="margin-top: 0; color: #0066cc;">Order Details</h2>
        <p><strong>Order Number:</strong> ${mockOrder.order_number}</p>
        <p><strong>Total Amount:</strong> ₹${mockOrder.total_amount.toFixed(2)}</p>
        <p><strong>Payment Method:</strong> Cash on Delivery</p>
        <p><strong>Payment Status:</strong> ${mockOrder.payment_status}</p>
      </div>

      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h3 style="margin-top: 0;">Customer Information</h3>
        <p><strong>Name:</strong> ${mockOrder.customer_name}</p>
        <p><strong>Email:</strong> ${mockOrder.customer_email}</p>
        <p><strong>Phone:</strong> ${mockOrder.customer_phone}</p>
      </div>

      <h3>Items Ordered:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Product</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Qty</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${mockOrder.items.map(item => `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">${item.product_name}</td>
              <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${item.price}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h3>Shipping Address:</h3>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
        <p style="margin: 5px 0;">${mockOrder.shipping_address.street}</p>
        <p style="margin: 5px 0;">${mockOrder.shipping_address.city}, ${mockOrder.shipping_address.state} ${mockOrder.shipping_address.zipCode}</p>
        <p style="margin: 5px 0;">${mockOrder.shipping_address.country}</p>
      </div>

      <div style="background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ffc107;">
        <p style="margin: 0;"><strong>Action Required:</strong> Please log in to your business dashboard to process this order.</p>
      </div>

      <p style="color: #666; font-size: 12px; margin-top: 40px;">
        This is an automated email notification from Ezypzy Shop.
      </p>
    </div>
  `;

  console.log('\n'.repeat(3));
  console.log('='.repeat(80));
  console.log('📧 EMAIL THAT WOULD BE SENT TO BUSINESS OWNER');
  console.log('='.repeat(80));
  console.log('TO:', businessOwnerEmail);
  console.log('FROM: Ezypzy Shop <ashokmittal919@gmail.com>');
  console.log('SUBJECT: New Order #' + mockOrder.order_number + ' - ' + mockOrder.business_name);
  console.log('\nHTML BODY:');
  console.log(businessEmailHtml);
  console.log('='.repeat(80));
  console.log('\n'.repeat(2));

  return NextResponse.json({
    message: 'Check the backend console/logs to see the email that would be sent',
    emailDetails: {
      to: businessOwnerEmail,
      from: 'Ezypzy Shop <ashokmittal919@gmail.com>',
      subject: `New Order #${mockOrder.order_number} - ${mockOrder.business_name}`,
      note: 'Email cannot be sent until sender is verified in SendGrid or Resend',
      nextSteps: [
        '1. Go to https://app.sendgrid.com/settings/sender_auth/senders',
        '2. Click "Create New Sender"',
        '3. Enter ashokmittal919@gmail.com',
        '4. Verify the email in your Gmail inbox',
        '5. Then emails will be delivered successfully'
      ]
    }
  });
}
