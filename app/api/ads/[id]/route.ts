// Build: 2026-01-16T14:51:54.971786
// Build timestamp: 2026-01-16T14:46:10.048579
import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

// Default product images by category (only used when image is NULL)
const DEFAULT_PRODUCT_IMAGES: Record<string, string> = {
  'grocery': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
  'restaurant': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
  'pharmacy': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
  'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
  'electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
  'fashion': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
  'default': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
};

function getDefaultImage(category?: string): string {
  if (category) {
    const lowerCategory = category.toLowerCase();
    for (const [key, url] of Object.entries(DEFAULT_PRODUCT_IMAGES)) {
      if (lowerCategory.includes(key)) {
        return url;
      }
    }
  }
  return DEFAULT_PRODUCT_IMAGES['default'];
}

// Helper to parse images JSON and limit to 5 images max
function parseAndLimitImages(imagesJson: any): string[] | null {
  if (!imagesJson) return null;
  
  try {
    let images: string[];
    if (typeof imagesJson === 'string') {
      images = JSON.parse(imagesJson);
    } else if (Array.isArray(imagesJson)) {
      images = imagesJson;
    } else {
      return null;
    }
    
    // Limit to 5 images max
    return images.slice(0, 5);
  } catch (error) {
    console.error('Error parsing images JSON:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const adId = parseInt(id, 10);

    if (isNaN(adId) || adId <= 0) {
      return NextResponse.json({ error: 'Invalid ad ID' }, { status: 400 });
    }

    const result = await sql`
      SELECT a.*, b.business_name
      FROM ads a
      LEFT JOIN businesses b ON a.business_id = b.id
      WHERE a.id = ${adId}
    `;

    const ad = result[0];
    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    // Fetch products for this ad if product_ids exist
    let products: any[] = [];
    try {
      if (ad.product_ids) {
        // Parse product_ids
        let productIds: number[] = [];
        if (typeof ad.product_ids === 'string') {
          productIds = JSON.parse(ad.product_ids);
        } else if (Array.isArray(ad.product_ids)) {
          productIds = ad.product_ids;
        }
        
        if (productIds.length > 0) {
          // Fetch each product individually with all image fields
          const productPromises = productIds.map((productId: number) => 
            sql`SELECT id, name, price, original_price, image, image2, image3, image4, image5, images, video, category, description, in_stock
                FROM products WHERE id = ${productId}`
          );
          
          const productResults = await Promise.all(productPromises);
          products = productResults
            .map((result: any) => result[0])
            .filter((product: any) => product) // Remove nulls
            .map((product: any) => {
              // Build images array
              const allImages: string[] = [];
              if (product.image) allImages.push(product.image);
              if (product.image2) allImages.push(product.image2);
              if (product.image3) allImages.push(product.image3);
              if (product.image4) allImages.push(product.image4);
              if (product.image5) allImages.push(product.image5);
              
              // Also check old 'images' JSON column
              const oldImages = parseAndLimitImages(product.images);
              if (oldImages && oldImages.length > 0) {
                allImages.push(...oldImages);
              }
              
              // Remove duplicates and limit to 5
              const uniqueImages = Array.from(new Set(allImages)).slice(0, 5);
              
              // Use actual image from DB, only use fallback if no image exists
              const imageUrl = product.image || getDefaultImage(product.category);
              
              return {
                id: product.id,
                name: product.name,
                price: product.price,
                original_price: product.original_price,
                image: imageUrl, // Primary display image
                images: uniqueImages.length > 0 ? uniqueImages : null,
                video: product.video,
                category: product.category,
                description: product.description,
                in_stock: product.in_stock,
              };
            });
        }
      }
    } catch (productError) {
      console.error('Error fetching products for ad:', productError);
      // Continue without products rather than failing
    }

    return NextResponse.json({
      ...ad,
      products,
    });
  } catch (error: any) {
    console.error('Error fetching ad:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad', details: error.message },
      { status: 500 }
    );
  }
}
