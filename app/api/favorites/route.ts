import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT f.*, p.name, p.price, p.images, p.category, p.business_id, b.business_name
      FROM favorites f
      JOIN products p ON f.product_id = p.id
      LEFT JOIN businesses b ON p.business_id = b.id
      WHERE f.user_id = ${userId}
      ORDER BY f.created_at DESC
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, productId } = await request.json();

    if (!userId || !productId) {
      return NextResponse.json(
        { error: 'User ID and Product ID are required' },
        { status: 400 }
      );
    }

    // Check if already favorited
    const existing = await sql`
      SELECT * FROM favorites WHERE user_id = ${userId} AND product_id = ${productId}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Product already in favorites' },
        { status: 409 }
      );
    }

    const result = await sql`
      INSERT INTO favorites (user_id, product_id, created_at)
      VALUES (${userId}, ${productId}, NOW())
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const productId = searchParams.get('productId');

    if (!userId || !productId) {
      return NextResponse.json(
        { error: 'User ID and Product ID are required' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM favorites WHERE user_id = ${userId} AND product_id = ${productId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
