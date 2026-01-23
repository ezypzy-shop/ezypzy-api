import { NextRequest, NextResponse } from 'next/server';
import sql from '../utils/sql';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Helper function to generate business image based on name/type
function generateBusinessImage(businessName: string, type?: string): string {
  // Map of business types to Unsplash search terms
  const typeMap: { [key: string]: string } = {
    'Restaurant': 'restaurant-food',
    'Cafe': 'coffee-cafe',
    'Bakery': 'bakery-bread',
    'Grocery': 'grocery-store',
    'Fashion': 'fashion-store',
    'Electronics': 'electronics-store',
    'Pharmacy': 'pharmacy-medical',
    'Flower Shop': 'flower-shop',
    'Book Store': 'bookstore',
    'Pet Store': 'pet-store',
    'Salon': 'salon-beauty',
    'Gym': 'gym-fitness',
  };

  // Try to find a matching type keyword
  let searchTerm = 'store';
  
  if (type) {
    for (const [key, value] of Object.entries(typeMap)) {
      if (type.toLowerCase().includes(key.toLowerCase())) {
        searchTerm = value;
        break;
      }
    }
  }

  return `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80`;
}

async function sendBusinessApprovalEmail(email: string, businessName: string, ownerName: string) {
  const fromEmail = process.env.FROM_EMAIL || 'ashokmittal919@gmail.com';
  
  const msg = {
    to: email,
    from: fromEmail,
    subject: `🎉 Your Business "${businessName}" is Live!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Business Approved</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">🎉 Congratulations!</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 600;">Hi ${ownerName},</h2>
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Great news! Your business <strong>"${businessName}"</strong> has been approved and is now live on EzyPzy Shop! 🚀
                    </p>
                    
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin: 30px 0;">
                      <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: 600;">What's Next?</h3>
                      <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 15px; line-height: 1.8;">
                        <li>Add your products to your business catalog</li>
                        <li>Set up your payment methods and delivery options</li>
                        <li>Start receiving orders from customers</li>
                        <li>Track your sales in the Business Dashboard</li>
                      </ul>
                    </div>
                    
                    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin: 20px 0;">
                      <p style="margin: 0; color: #065f46; font-size: 14px;">
                        💡 <strong>Pro Tip:</strong> Add high-quality photos and detailed descriptions to attract more customers!
                      </p>
                    </div>
                    
                    <p style="margin: 30px 0 0 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                      If you have any questions or need assistance, our support team is here to help.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                      Happy selling! 🛍️
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      © ${new Date().getFullYear()} EzyPzy Shop. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Business approval email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending business approval email:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/businesses] Request received');
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const userId = searchParams.get('user_id');

    let result;
    const startTime = Date.now();

    if (userId) {
      // Fetch businesses owned by this user
      console.log('[GET /api/businesses] Fetching businesses for user:', userId);
      result = await sql`
        SELECT 
          id, owner_id, business_name, business_email, business_phone, 
          description, logo, banner_image, address, city, state, zipcode, 
          category, is_verified, is_active, created_at, updated_at
        FROM businesses 
        WHERE owner_id = ${userId} 
        ORDER BY created_at DESC
      `;
    } else if (search) {
      // Global search - use business_name
      console.log('[GET /api/businesses] Searching for:', search);
      const searchTerm = `%${search}%`;
      result = await sql`
        SELECT 
          id, owner_id, business_name, business_email, business_phone, 
          description, logo, banner_image, address, city, state, zipcode, 
          category, is_verified, is_active, created_at, updated_at
        FROM businesses 
        WHERE business_name ILIKE ${searchTerm} OR description ILIKE ${searchTerm}
        ORDER BY created_at DESC
      `;
    } else if (category && category !== 'All') {
      // Filter by category
      console.log('[GET /api/businesses] Filtering by category:', category);
      result = await sql`
        SELECT 
          id, owner_id, business_name, business_email, business_phone, 
          description, logo, banner_image, address, city, state, zipcode, 
          category, is_verified, is_active, created_at, updated_at
        FROM businesses 
        WHERE category = ${category}
        ORDER BY created_at DESC
      `;
    } else {
      // Fetch all active businesses
      console.log('[GET /api/businesses] Fetching all businesses');
      result = await sql`
        SELECT 
          id, owner_id, business_name, business_email, business_phone, 
          description, logo, banner_image, address, city, state, zipcode, 
          category, is_verified, is_active, created_at, updated_at
        FROM businesses 
        WHERE is_active = true
        ORDER BY created_at DESC 
        LIMIT 100
      `;
    }

    const queryTime = Date.now() - startTime;
    console.log(`[GET /api/businesses] Query completed in ${queryTime}ms, returned ${result.length} businesses`);

    // Ensure result is an array and auto-assign images
    const businesses = Array.isArray(result) ? result.map(business => ({
      ...business,
      // Auto-assign logo if missing
      logo: business.logo && business.logo.trim() !== '' 
        ? business.logo 
        : generateBusinessImage(business.business_name, business.category),
      // Map business_name to name for backwards compatibility
      name: business.business_name
    })) : [];
    
    // Return with CORS headers
    return NextResponse.json({ businesses }, { 
      status: 200,
      headers: corsHeaders 
    });
  } catch (error: any) {
    console.error('[GET /api/businesses] Error:', error);
    console.error('[GET /api/businesses] Error stack:', error.stack);
    // CRITICAL: Always return valid JSON with 200 status to prevent HTML error pages
    return NextResponse.json(
      { businesses: [], error: 'Failed to fetch businesses', details: error.message },
      { 
        status: 200,
        headers: corsHeaders 
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[POST /api/businesses] Request body:', JSON.stringify(body, null, 2));
    
    const {
      owner_id,
      business_name,
      description,
      logo,
      category,
      business_phone,
      business_email,
      address,
      city,
      state,
      zipcode,
      is_verified = false,
      is_active = true,
    } = body;

    // Validate required fields
    if (!owner_id || !business_name || !category || !business_phone || !address) {
      console.error('[POST /api/businesses] Validation failed:', {
        owner_id, business_name, category, business_phone, address
      });
      return NextResponse.json(
        { error: 'Missing required fields: owner_id, business_name, category, business_phone, address' },
        { 
          status: 400,
          headers: corsHeaders 
        }
      );
    }

    // ✅ CHECK 1: Verify user doesn't already have a business
    const existingUserBusiness = await sql`
      SELECT id, business_name FROM businesses WHERE owner_id = ${owner_id} LIMIT 1
    `;
    
    if (existingUserBusiness.length > 0) {
      console.error('[POST /api/businesses] User already has a business:', existingUserBusiness[0]);
      return NextResponse.json(
        { error: `You already have a business: "${existingUserBusiness[0].business_name}". Each user can only create one business.` },
        { 
          status: 400,
          headers: corsHeaders 
        }
      );
    }

    // ✅ CHECK 2: Verify business name is unique (case-insensitive)
    const existingBusinessName = await sql`
      SELECT id, business_name FROM businesses WHERE LOWER(business_name) = LOWER(${business_name}) LIMIT 1
    `;
    
    if (existingBusinessName.length > 0) {
      console.error('[POST /api/businesses] Business name already exists:', existingBusinessName[0]);
      return NextResponse.json(
        { error: `Business name "${business_name}" is already taken. Please choose a different name.` },
        { 
          status: 400,
          headers: corsHeaders 
        }
      );
    }

    // Auto-generate image if not provided
    const finalLogo = logo || generateBusinessImage(business_name, category);

    console.log('[POST /api/businesses] Creating business');

    const result = await sql`
      INSERT INTO businesses (
        owner_id, business_name, description, logo, category, business_phone, 
        business_email, address, city, state, zipcode, is_verified, is_active, 
        created_at, updated_at
      )
      VALUES (
        ${owner_id}, ${business_name}, ${description || ''}, ${finalLogo}, ${category},
        ${business_phone}, ${business_email || ''}, ${address}, ${city || ''}, 
        ${state || ''}, ${zipcode || ''}, ${is_verified}, ${is_active},
        NOW(), NOW()
      )
      RETURNING *
    `;

    console.log('[POST /api/businesses] Business created successfully:', result[0].id);
    
    // Get user info for email
    if (business_email && result[0]) {
      try {
        const users = await sql`SELECT * FROM users WHERE id = ${owner_id}`;
        const ownerName = users[0]?.name || 'Business Owner';
        await sendBusinessApprovalEmail(business_email, business_name, ownerName);
      } catch (emailError) {
        console.error('Failed to send business approval email:', emailError);
      }
    }
    
    return NextResponse.json(result[0], { 
      status: 201,
      headers: corsHeaders 
    });
  } catch (error: any) {
    console.error('[POST /api/businesses] Error creating business:', error);
    console.error('[POST /api/businesses] Error details:', error.message);
    console.error('[POST /api/businesses] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to create business', details: error.message },
      { 
        status: 500,
        headers: corsHeaders 
      }
    );
  }
}
