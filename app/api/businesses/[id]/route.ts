import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper function to generate business image based on name/type
function generateBusinessImage(businessName: string, category?: string): string {
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
  
  if (category) {
    for (const [key, value] of Object.entries(typeMap)) {
      if (category.toLowerCase().includes(key.toLowerCase())) {
        searchTerm = value;
        break;
      }
    }
  }

  return `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80`;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const businessId = parseInt(id, 10);
    if (isNaN(businessId) || businessId <= 0) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400, headers: corsHeaders });
    }

    const businesses = await sql`SELECT * FROM businesses WHERE id = ${businessId}`;

    if (businesses.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404, headers: corsHeaders });
    }

    const business = businesses[0];

    // Auto-assign image if missing
    if (!business.logo || business.logo.trim() === '') {
      business.logo = generateBusinessImage(business.business_name, business.category);
    }

    // Fetch products for this business
    const products = await sql`SELECT * FROM products WHERE business_id = ${businessId}`;

    // Auto-assign images for products without images
    const productsWithImages = products.map(product => {
      if (!product.image || product.image.trim() === '') {
        product.image = `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80`;
      }
      return product;
    });

    return NextResponse.json({ 
      business,
      products: productsWithImages
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching business:', error);
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500, headers: corsHeaders });
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const updates = await request.json();

    console.log('=== UPDATE BUSINESS REQUEST ===');
    console.log('Business ID:', id);
    console.log('Updates:', JSON.stringify(updates, null, 2));

    const businessId = parseInt(id, 10);
    if (isNaN(businessId) || businessId <= 0) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400, headers: corsHeaders });
    }

    // First get the existing business
    const existing = await sql`SELECT * FROM businesses WHERE id = ${businessId}`;
    
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404, headers: corsHeaders });
    }

    const current = existing[0];
    console.log('Current business:', JSON.stringify(current, null, 2));

    // Merge updates with existing values (using business_name column)
    const business_name = updates.business_name !== undefined ? updates.business_name : current.business_name;
    const description = updates.description !== undefined ? updates.description : current.description;
    const logo = updates.logo !== undefined ? updates.logo : current.logo;
    const category = updates.category !== undefined ? updates.category : current.category;
    const business_phone = updates.business_phone !== undefined ? updates.business_phone : current.business_phone;
    const business_email = updates.business_email !== undefined ? updates.business_email : current.business_email;
    const address = updates.address !== undefined ? updates.address : current.address;
    const city = updates.city !== undefined ? updates.city : current.city;
    const state = updates.state !== undefined ? updates.state : current.state;
    const zipcode = updates.zipcode !== undefined ? updates.zipcode : current.zipcode;
    const is_verified = updates.is_verified !== undefined ? updates.is_verified : current.is_verified;
    const is_active = updates.is_active !== undefined ? updates.is_active : current.is_active;

    console.log('Merged values:', {
      business_name,
      description: description?.substring(0, 50) + '...',
      logo,
      category,
      business_phone,
      business_email,
      address,
      city,
      state,
      zipcode,
      is_verified,
      is_active
    });

    // Update the business
    console.log('Executing UPDATE query...');
    const result = await sql`
      UPDATE businesses 
      SET 
        business_name = ${business_name},
        description = ${description},
        logo = ${logo},
        category = ${category},
        business_phone = ${business_phone},
        business_email = ${business_email},
        address = ${address},
        city = ${city},
        state = ${state},
        zipcode = ${zipcode},
        is_verified = ${is_verified},
        is_active = ${is_active},
        updated_at = NOW()
      WHERE id = ${businessId}
      RETURNING *
    `;

    console.log('UPDATE successful, result:', JSON.stringify(result[0], null, 2));
    return NextResponse.json(result[0], { headers: corsHeaders });
  } catch (error: any) {
    console.error('=== ERROR UPDATING BUSINESS ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error:', error);
    return NextResponse.json({ 
      error: 'Failed to update business',
      details: error?.message || 'Unknown error'
    }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const businessId = parseInt(id, 10);
    if (isNaN(businessId) || businessId <= 0) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400, headers: corsHeaders });
    }

    await sql`DELETE FROM products WHERE business_id = ${businessId}`;
    const result = await sql`DELETE FROM businesses WHERE id = ${businessId} RETURNING *`;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ message: 'Business deleted successfully' }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error deleting business:', error);
    return NextResponse.json({ error: 'Failed to delete business' }, { status: 500, headers: corsHeaders });
  }
}
