import { NextRequest, NextResponse } from 'next/server';
import sql from '../utils/sql';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@ezypzy.shop';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'EzyPzy Shop';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const businessIds = searchParams.get('business_ids');

    console.log('📦 [Backend] Fetching orders - userId:', userId, 'businessIds:', businessIds);

    if (!userId && !businessIds) {
      return NextResponse.json({ error: 'user_id or business_ids required' }, { status: 400 });
    }

    let orders;
    
    if (userId) {
      // Get orders placed by this user
      console.log('📦 [Backend] Fetching orders for user:', userId);
      orders = await sql`
        SELECT 
          o.*,
          b.business_name,
          b.image as business_logo
        FROM orders o
        LEFT JOIN businesses b ON b.id = o.business_id
        WHERE o.user_id = ${parseInt(userId)}
        ORDER BY o.created_at DESC
      `;
      console.log('📦 [Backend] Found', orders.length, 'orders for user');
    } else {
      // Get orders for businesses owned by this user
      const businessIdArray = businessIds!.split(',').map(id => parseInt(id));
      console.log('📦 [Backend] Fetching orders for business IDs:', businessIdArray);
      
      orders = await sql`
        SELECT 
          o.*,
          b.business_name,
          b.image as business_logo
        FROM orders o
        LEFT JOIN businesses b ON b.id = o.business_id
        WHERE o.business_id = ANY(${businessIdArray})
        ORDER BY o.created_at DESC
      `;
      console.log('📦 [Backend] Found', orders.length, 'orders for businesses');
    }

    console.log('✅ [Backend] Returning', orders.length, 'orders');
    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('❌ [Backend] Error fetching orders:', error);
    console.error('❌ [Backend] Error message:', error.message);
    console.error('❌ [Backend] Error stack:', error.stack);
    return NextResponse.json({ error: 'Failed to fetch orders', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      deviceId,
      businessId,
      orderNumber,
      deliveryType,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      paymentMethod,
      subtotal,
      deliveryFee,
      discountCode,
      discountAmount,
      total,
      notes,
      specialInstructions,
      items = [],
      customOrders = [],
      referralCode,
    } = body;

    console.log('📧 [Email Debug] Starting order creation process...');
    console.log('📧 [Email Debug] SendGrid API Key exists:', !!SENDGRID_API_KEY);
    console.log('📧 [Email Debug] FROM email:', SENDGRID_FROM_EMAIL);
    console.log('📧 [Email Debug] Customer email:', customerEmail);

    // Validate required fields
    if (!businessId || !orderNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get commission rate for this business
    const businessResult = await sql`
      SELECT commission_rate, business_name, user_id, email, business_notifications_consent
      FROM businesses 
      WHERE id = ${businessId}
    `;

    if (businessResult.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const business = businessResult[0];
    console.log('📧 [Email Debug] Business details:', {
      name: business.business_name,
      email: business.email,
      consent: business.business_notifications_consent
    });

    const commissionRate = parseFloat(business.commission_rate || '0');
    const commissionAmount = (parseFloat(subtotal) * commissionRate) / 100;

    // Create order with items stored in the orders table directly
    const order = await sql`
      INSERT INTO orders (
        user_id,
        device_id,
        business_id,
        order_number,
        status,
        delivery_type,
        customer_name,
        customer_phone,
        customer_email,
        delivery_address,
        payment_method,
        subtotal,
        delivery_fee,
        discount_code,
        discount_amount,
        total,
        notes,
        special_instructions,
        commission_rate,
        commission_amount,
        payment_status,
        items
      ) VALUES (
        ${userId || null},
        ${deviceId || null},
        ${businessId},
        ${orderNumber},
        'pending',
        ${deliveryType},
        ${customerName},
        ${customerPhone},
        ${customerEmail},
        ${deliveryAddress || null},
        ${paymentMethod},
        ${subtotal},
        ${deliveryFee},
        ${discountCode || null},
        ${discountAmount || 0},
        ${total},
        ${notes || null},
        ${specialInstructions || null},
        ${commissionRate},
        ${commissionAmount},
        'pending',
        ${JSON.stringify(items)}
      )
      RETURNING *
    `;

    const orderId = order[0].id;

    // Insert custom orders if any
    if (customOrders && customOrders.length > 0) {
      for (const customOrder of customOrders) {
        await sql`
          INSERT INTO custom_orders (
            order_id,
            business_id,
            user_id,
            device_id,
            description,
            image_url,
            delivery_preference
          ) VALUES (
            ${orderId},
            ${businessId},
            ${userId || null},
            ${deviceId || null},
            ${customOrder.description},
            ${customOrder.image_url || null},
            ${customOrder.delivery_preference || 'pickup'}
          )
        `;
      }
    }

    // Handle referral completion if referral code was used
    if (referralCode) {
      try {
        // Get referral details
        const referralResult = await sql`
          SELECT id, referrer_id, reward_amount, used_at 
          FROM referrals 
          WHERE code = ${referralCode} AND used_at IS NULL
        `;

        if (referralResult.length > 0) {
          const referral = referralResult[0];

          // Mark referral as used
          await sql`
            UPDATE referrals 
            SET used_at = NOW() 
            WHERE id = ${referral.id}
          `;

          // Award coins to referrer
          await sql`
            UPDATE users 
            SET coins = COALESCE(coins, 0) + ${referral.reward_amount}
            WHERE id = ${referral.referrer_id}
          `;

          console.log(`Referral completed: ${referralCode} - ${referral.reward_amount} coins awarded`);
        }
      } catch (refError) {
        console.error('Error completing referral:', refError);
        // Don't fail the order if referral processing fails
      }
    }

    // **Send Notifications**
    console.log('📧 [Email Debug] Starting notification process...');
    
    // Helper functions
    const formatCurrency = (amount: number | string) => {
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(num)) return '₹0.00';
      return `₹${num.toFixed(2)}`;
    };

    const getPaymentLabel = (method: string) => {
      switch (method) {
        case 'gpay': return 'Google Pay';
        case 'paytm': return 'Paytm';
        case 'card': return 'Credit/Debit Card';
        case 'cod': return 'Cash on Delivery';
        case 'cop': return 'Cash on Pickup';
        default: return method;
      }
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    };

    const hasProducts = items.length > 0;
    const hasCustomOrders = customOrders.length > 0;
    const isCustomOrderOnly = !hasProducts && hasCustomOrders;

    // Build product items HTML
    let productItemsHtml = '';
    if (hasProducts) {
      productItemsHtml = `
        <div style="margin: 20px 0;">
          <h3 style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px;">Order Items</h3>
          ${items.map((item: any) => {
            const itemTotal = item.price * item.quantity;
            return `
              <div style="display: flex; align-items: center; padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;">
                ${item.image ? `<img src="${item.image}" alt="${item.product_name}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; margin-right: 12px;" />` : ''}
                <div style="flex: 1;">
                  <div style="font-weight: 500; color: #374151; margin-bottom: 4px;">${item.product_name}</div>
                  <div style="font-size: 13px; color: #9ca3af;">Qty: ${item.quantity}</div>
                </div>
                <div style="font-weight: 600; color: #111827;">${formatCurrency(itemTotal)}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // Build custom orders HTML
    let customOrdersHtml = '';
    if (hasCustomOrders) {
      customOrdersHtml = `
        <div style="margin: 20px 0; padding: 16px; background: #fff7ed; border-left: 4px solid #f97316; border-radius: 8px;">
          <h3 style="font-size: 16px; font-weight: 600; color: #f97316; margin-bottom: 12px;">
            ${customOrders.length > 1 ? 'Custom Requests' : 'Custom Request'}
          </h3>
          ${customOrders.map((customOrder: any) => `
            <div style="margin-bottom: 12px; padding: 12px; background: #ffffff; border-radius: 8px;">
              <p style="color: #374151; margin-bottom: 8px;">${customOrder.description}</p>
              ${customOrder.image_url ? `
                <img src="${customOrder.image_url}" alt="Custom order" style="width: 100%; max-width: 400px; border-radius: 8px; margin-bottom: 8px;" />
              ` : ''}
              <div style="display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500;">
                📍 Price estimate on ${customOrder.delivery_preference === 'delivery' ? 'delivery' : 'pickup'}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Build price summary HTML (only if products exist)
    let priceSummaryHtml = '';
    if (hasProducts) {
      priceSummaryHtml = `
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Subtotal</span>
            <span style="color: #374151;">${formatCurrency(subtotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">${deliveryType === 'delivery' ? 'Delivery Fee' : 'Pickup'}</span>
            <span style="color: #374151;">${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Free'}</span>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 18px; font-weight: 600; color: #111827;">Total Paid</span>
            <span style="font-size: 22px; font-weight: 700; color: #f97316;">${formatCurrency(total)}</span>
          </div>
        </div>
      `;
    }

    // Build delivery details HTML
    const deliveryDetailsHtml = `
      <div style="margin: 20px 0;">
        <h3 style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px;">
          ${deliveryType === 'delivery' ? '🚚 Delivery Details' : '🏪 Pickup Details'}
        </h3>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Customer</span>
            <span style="color: #111827; font-weight: 500;">${customerName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Phone</span>
            <span style="color: #111827; font-weight: 500;">${customerPhone}</span>
          </div>
          ${deliveryType === 'delivery' && deliveryAddress ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Address</span>
              <span style="color: #111827; font-weight: 500; text-align: right; max-width: 60%;">${deliveryAddress}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Status</span>
            <span style="background: #fef3c7; color: #f59e0b; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
              ${isCustomOrderOnly ? 'Awaiting Quote' : 'Pending'}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6b7280;">Order Time</span>
            <span style="color: #111827; font-weight: 500;">${formatDate(order[0].created_at)}</span>
          </div>
        </div>
      </div>
    `;

    // Build payment details HTML
    const paymentDetailsHtml = `
      <div style="margin: 20px 0;">
        <h3 style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px;">💳 Payment</h3>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Method</span>
            <span style="color: #111827; font-weight: 500;">${getPaymentLabel(paymentMethod)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6b7280;">Status</span>
            <span style="color: #111827; font-weight: 500;">
              ${paymentMethod === 'cod' || paymentMethod === 'cop' 
                ? `Pay on ${paymentMethod === 'cod' ? 'delivery' : 'pickup'}`
                : isCustomOrderOnly ? 'Pay after quote' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    `;

    // Build special instructions HTML
    let specialInstructionsHtml = '';
    if (specialInstructions) {
      specialInstructionsHtml = `
        <div style="margin: 20px 0;">
          <h3 style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px;">📝 Special Instructions</h3>
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; color: #374151; line-height: 1.6;">
            ${specialInstructions}
          </div>
        </div>
      `;
    }

    try {
      // 1. Send notification to CUSTOMER
      if (userId) {
        // Create in-app notification for customer
        await sql`
          INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            order_id
          ) VALUES (
            ${userId},
            ${'🎉 Your order has been placed!'},
            ${`Your order ${orderNumber} has been placed at ${business.business_name}. You'll receive updates as it's processed.`},
            ${'order'},
            ${orderId}
          )
        `;
        console.log('✅ [Email Debug] In-app notification created for customer');
      }

      // Send email to customer (if SendGrid is configured)
      if (SENDGRID_API_KEY && customerEmail) {
        console.log('📧 [Email Debug] Attempting to send customer email to:', customerEmail);
        try {
          const customerEmailContent = {
            to: customerEmail,
            from: {
              email: SENDGRID_FROM_EMAIL,
              name: SENDGRID_FROM_NAME
            },
            subject: `${isCustomOrderOnly ? 'Request Submitted' : 'Order Confirmation'} - ${orderNumber}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f9fafb;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 20px; text-align: center;">
                    <div style="display: inline-block; background: #ffffff; width: 80px; height: 80px; border-radius: 40px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 40px;">✅</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                      ${isCustomOrderOnly ? 'Request Submitted!' : 'Order Placed!'}
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">
                      ${isCustomOrderOnly 
                        ? 'The store will review your request and provide a quote'
                        : 'Your order has been confirmed'}
                    </p>
                  </div>

                  <!-- Content -->
                  <div style="padding: 32px 20px;">
                    <!-- Greeting -->
                    <p style="color: #111827; font-size: 16px; margin: 0 0 24px 0;">Hi ${customerName},</p>
                    
                    <!-- Order Number -->
                    <div style="background: #fff7ed; border: 2px solid #fed7aa; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                      <div style="color: #f97316; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px;">ORDER NUMBER</div>
                      <div style="color: #111827; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">${orderNumber}</div>
                      <div style="color: #9ca3af; font-size: 12px; margin-top: 8px;">Reference ID: #${orderId}</div>
                    </div>

                    <!-- Business Name -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <p style="color: #6b7280; margin: 0;">Order from</p>
                      <p style="color: #111827; font-size: 18px; font-weight: 600; margin: 4px 0 0 0;">${business.business_name}</p>
                    </div>

                    <!-- Order Summary -->
                    <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <h2 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">📦 Order Summary</h2>
                      
                      ${productItemsHtml}
                      ${customOrdersHtml}
                      ${priceSummaryHtml}
                      
                      ${isCustomOrderOnly ? `
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin-top: 16px;">
                          <p style="color: #166534; font-size: 13px; line-height: 1.6; margin: 0;">
                            💡 You'll receive the price estimate when the store prepares your items. Payment will be collected on ${deliveryType === 'delivery' ? 'delivery' : 'pickup'}.
                          </p>
                        </div>
                      ` : ''}
                    </div>

                    ${deliveryDetailsHtml}
                    ${paymentDetailsHtml}
                    ${specialInstructionsHtml}

                    <!-- Footer Message -->
                    <div style="background: #dcfce7; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px; margin-top: 24px;">
                      <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.6;">
                        ✅ You'll receive updates on your order status via email and in-app notifications.
                      </p>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0; text-align: center;">
                      Thank you for shopping with us!
                    </p>
                  </div>

                  <!-- Footer -->
                  <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      This email was sent by ${SENDGRID_FROM_NAME}
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          };
          
          const customerEmailResult = await sgMail.send(customerEmailContent);
          console.log('✅ [Email Debug] Customer email sent successfully!', customerEmailResult[0].statusCode);
        } catch (emailError: any) {
          console.error('❌ [Email Debug] Error sending customer email:', emailError);
          console.error('❌ [Email Debug] Error response:', emailError?.response?.body);
        }
      } else {
        console.log('⚠️ [Email Debug] Customer email NOT sent. SendGrid:', !!SENDGRID_API_KEY, 'Customer email:', !!customerEmail);
      }

      // 2. Send notification to BUSINESS OWNER
      const businessOwnerId = business.user_id;
      
      if (businessOwnerId) {
        // Create in-app notification for business owner
        await sql`
          INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            order_id
          ) VALUES (
            ${businessOwnerId},
            ${'🔔 New Order Received!'},
            ${`New order ${orderNumber} from ${customerName}. Total: ₹${total}`},
            ${'order'},
            ${orderId}
          )
        `;
        console.log('✅ [Email Debug] In-app notification created for business owner');
      }

      // Send email to business owner (if SendGrid is configured)
      if (SENDGRID_API_KEY && business.email) {
        console.log('📧 [Email Debug] Attempting to send business owner email to:', business.email);
        
        try {
          const businessEmailContent = {
            to: business.email,
            from: {
              email: SENDGRID_FROM_EMAIL,
              name: SENDGRID_FROM_NAME
            },
            subject: `🔔 New Order Received - ${orderNumber}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f9fafb;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 20px; text-align: center;">
                    <div style="display: inline-block; background: #ffffff; width: 80px; height: 80px; border-radius: 40px; margin-bottom: 16px;">
                      <span style="font-size: 40px;">🔔</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">New Order Received!</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">You have a new order to process</p>
                  </div>

                  <!-- Content -->
                  <div style="padding: 32px 20px;">
                    <p style="color: #111827; font-size: 16px; margin: 0 0 24px 0;">Hi ${business.business_name},</p>
                    
                    <!-- Order Number -->
                    <div style="background: #fff7ed; border: 2px solid #fed7aa; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                      <div style="color: #f97316; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px;">ORDER NUMBER</div>
                      <div style="color: #111827; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">${orderNumber}</div>
                      <div style="color: #9ca3af; font-size: 12px; margin-top: 8px;">Reference ID: #${orderId}</div>
                    </div>

                    <!-- Order Summary -->
                    <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <h2 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">📦 Order Details</h2>
                      
                      ${productItemsHtml}
                      ${customOrdersHtml}
                      ${priceSummaryHtml}
                    </div>

                    <!-- Customer Info -->
                    <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <h2 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">👤 Customer Information</h2>
                      <div style="margin-bottom: 8px;">
                        <span style="color: #6b7280;">Name:</span>
                        <span style="color: #111827; font-weight: 500; margin-left: 8px;">${customerName}</span>
                      </div>
                      <div style="margin-bottom: 8px;">
                        <span style="color: #6b7280;">Phone:</span>
                        <span style="color: #111827; font-weight: 500; margin-left: 8px;">${customerPhone}</span>
                      </div>
                      <div>
                        <span style="color: #6b7280;">Email:</span>
                        <span style="color: #111827; font-weight: 500; margin-left: 8px;">${customerEmail}</span>
                      </div>
                    </div>

                    ${deliveryDetailsHtml}
                    ${paymentDetailsHtml}
                    ${specialInstructionsHtml}

                    <!-- Action Required -->
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin-top: 24px;">
                      <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6; font-weight: 600;">
                        ⚡ Please process this order as soon as possible. The customer is waiting for your confirmation!
                      </p>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      This email was sent by ${SENDGRID_FROM_NAME}
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          };
          
          const businessEmailResult = await sgMail.send(businessEmailContent);
          console.log('✅ [Email Debug] Business owner email sent successfully!', businessEmailResult[0].statusCode);
        } catch (emailError: any) {
          console.error('❌ [Email Debug] Error sending business owner email:', emailError);
          console.error('❌ [Email Debug] Error response:', emailError?.response?.body);
        }
      } else {
        console.log('⚠️ [Email Debug] Business owner email NOT sent. SendGrid:', !!SENDGRID_API_KEY, 'Business email:', business.email);
      }
    } catch (notificationError) {
      console.error('❌ [Email Debug] Error in notification block:', notificationError);
      // Don't fail the order if notifications fail
    }

    console.log('✅ [Email Debug] Order creation completed successfully');

    return NextResponse.json({ 
      success: true, 
      orderId,
      orderNumber,
      message: 'Order created successfully'
    });
  } catch (error: any) {
    console.error('❌ [Email Debug] Error creating order:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, status, trackingUrl } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update order status
    const updated = await sql`
      UPDATE orders
      SET 
        status = ${status},
        tracking_url = ${trackingUrl || null},
        updated_at = NOW()
      WHERE id = ${orderId}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get user_id and order details for notification
    const order = updated[0];
    
    // Send notification to customer about status update
    if (order.user_id) {
      try {
        let notificationMessage = '';
        let notificationTitle = '';

        switch (status) {
          case 'processing':
            notificationTitle = '⏳ Order Being Prepared';
            notificationMessage = `Your order ${order.order_number} is being prepared.`;
            break;
          case 'ready':
            notificationTitle = '✅ Order Ready';
            notificationMessage = `Your order ${order.order_number} is ready for ${order.delivery_type === 'delivery' ? 'delivery' : 'pickup'}!`;
            break;
          case 'out_for_delivery':
            notificationTitle = '🚚 Out for Delivery';
            notificationMessage = `Your order ${order.order_number} is out for delivery!`;
            break;
          case 'delivered':
            notificationTitle = '🎉 Order Delivered';
            notificationMessage = `Your order ${order.order_number} has been delivered. Enjoy!`;
            break;
          case 'completed':
            notificationTitle = '✅ Order Completed';
            notificationMessage = `Your order ${order.order_number} has been completed. Thank you!`;
            break;
          case 'cancelled':
            notificationTitle = '❌ Order Cancelled';
            notificationMessage = `Your order ${order.order_number} has been cancelled.`;
            break;
          default:
            notificationTitle = '📦 Order Update';
            notificationMessage = `Your order ${order.order_number} status has been updated to: ${status}`;
        }

        await sql`
          INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            order_id
          ) VALUES (
            ${order.user_id},
            ${notificationTitle},
            ${notificationMessage},
            ${'order'},
            ${orderId}
          )
        `;
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
      }
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
