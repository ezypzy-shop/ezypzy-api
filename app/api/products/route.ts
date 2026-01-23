import { NextRequest, NextResponse } from 'next/server';
import sql from '../utils/sql';

// Helper function to generate Unsplash image based on product name
function generateProductImage(productName: string, category?: string): string {
  // Map of common product categories to Unsplash search terms
  const categoryMap: { [key: string]: string } = {
    'Electronics': 'electronics-gadget',
    'Fashion': 'fashion-clothing',
    'Food': 'food-dish',
    'Groceries': 'grocery-food',
    'Beverages': 'drinks-beverage',
    'Books': 'books',
    'Beauty': 'beauty-cosmetics',
    'Sports': 'sports-equipment',
    'Toys': 'toys-games',
    'Furniture': 'furniture',
    'Home': 'home-decor',
    'Garden': 'garden-plants',
    'Automotive': 'car-automotive',
    'Health': 'health-wellness',
    'Pet': 'pet-animals',
  };

  // Try to find a matching category keyword
  let searchTerm = 'product';
  
  if (category) {
    for (const [key, value] of Object.entries(categoryMap)) {
      if (category.toLowerCase().includes(key.toLowerCase())) {
        searchTerm = value;
        break;
      }
    }
  }
  
  // If no category match, extract first meaningful word from product name
  if (searchTerm === 'product' && productName) {
    const keywords = productName.toLowerCase().replace(/[^\w\s]/g, ' ').split(' ').filter(w => w.length > 2);
    if (keywords.length > 0) {
      searchTerm = keywords[0];
    }
  }

  return `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const productId = searchParams.get('id');

    // Fetch single product by ID
    if (productId) {
      const result = await sql`
        SELECT * FROM products WHERE id = ${productId}
      `;
      
      if (result.length === 0) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // Auto-assign image if missing
      const product = result[0];
      if (!product.image || product.image.trim() === '') {
        product.image = generateProductImage(product.name, product.category);
      }
      
      return NextResponse.json(product);
    }

    // Fetch products by business_id
    if (businessId) {
      const products = await sql`
        SELECT * FROM products 
        WHERE business_id = ${businessId}
        ORDER BY created_at DESC
      `;

      // Auto-assign images for products without images
      const productsWithImages = products.map(product => {
        if (!product.image || product.image.trim() === '') {
          product.image = generateProductImage(product.name, product.category);
        }
        return product;
      });

      return NextResponse.json(productsWithImages);
    }

    // Fetch all products
    const products = await sql`
      SELECT * FROM products 
      ORDER BY created_at DESC
    `;

    // Auto-assign images for products without images
    const productsWithImages = products.map(product => {
      if (!product.image || product.image.trim() === '') {
        product.image = generateProductImage(product.name, product.category);
      }
      return product;
    });

    return NextResponse.json(productsWithImages);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      business_id, 
      name, 
      description, 
      price, 
      original_price,
      image, 
      image2,
      image3,
      image4,
      image5,
      video_url,
      category, 
      in_stock 
    } = body;

    if (!business_id || !name || !price || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Auto-generate image if not provided
    const finalImage = image || generateProductImage(name, category);

    const result = await sql`
      INSERT INTO products (
        business_id, 
        name, 
        description, 
        price, 
        original_price,
        image, 
        image2,
        image3,
        image4,
        image5,
        video_url,
        category, 
        in_stock
      )
      VALUES (
        ${business_id}, 
        ${name}, 
        ${description || ''}, 
        ${price}, 
        ${original_price || null},
        ${finalImage}, 
        ${image2 || null},
        ${image3 || null},
        ${image4 || null},
        ${image5 || null},
        ${video_url || null},
        ${category}, 
        ${in_stock !== undefined ? in_stock : true}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    
    const { 
      name, 
      description, 
      price, 
      original_price,
      image, 
      image2,
      image3,
      image4,
      image5,
      video_url,
      category, 
      in_stock 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // If image is being cleared (empty string), generate a new one
    const finalImage = image === '' ? generateProductImage(name, category) : image;

    const result = await sql`
      UPDATE products 
      SET 
        name = ${name}, 
        description = ${description || ''}, 
        price = ${price}, 
        original_price = ${original_price || null},
        image = ${finalImage || ''}, 
        image2 = ${image2 || null},
        image3 = ${image3 || null},
        image4 = ${image4 || null},
        image5 = ${image5 || null},
        video_url = ${video_url || null},
        category = ${category}, 
        in_stock = ${in_stock !== undefined ? in_stock : true}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const result = await sql`
      DELETE FROM products 
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
