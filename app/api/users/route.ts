import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password, login_method, is_business_user } = body;

    console.log('[API] POST /api/users - Creating user:', { name, email, phone, login_method, is_business_user });

    // Validate required fields
    if (!name || !login_method) {
      return NextResponse.json(
        { error: 'Name and login method are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (email) {
      const existingUser = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
      if (existingUser.length > 0) {
        return NextResponse.json(
          { 
            error: 'ACCOUNT_EXISTS',
            message: 'An account with this email already exists. Please sign in instead.'
          },
          { status: 409 }
        );
      }
    }

    if (phone) {
      const existingUser = await sql`SELECT id FROM users WHERE phone = ${phone}`;
      if (existingUser.length > 0) {
        return NextResponse.json(
          { 
            error: 'ACCOUNT_EXISTS',
            message: 'An account with this phone number already exists. Please sign in instead.'
          },
          { status: 409 }
        );
      }
    }

    // Hash password if provided
    const hashedPassword = password ? hashPassword(password) : null;

    // Create user
    const result = await sql`
      INSERT INTO users (
        full_name,
        email,
        phone,
        password_hash,
        login_method,
        is_business_user
      )
      VALUES (
        ${name},
        ${email ? email.toLowerCase() : null},
        ${phone || null},
        ${hashedPassword},
        ${login_method},
        ${is_business_user || false}
      )
      RETURNING 
        id,
        full_name as name,
        email,
        phone,
        login_method,
        is_business_user,
        created_at
    `;

    console.log('[API] POST /api/users - User created successfully:', result[0].id);

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('[API] Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    const finalId = id || userId;

    if (finalId) {
      const result = await sql`SELECT * FROM users WHERE id = ${finalId}`;
      if (result.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(result[0]);
    }

    if (email) {
      const result = await sql`SELECT * FROM users WHERE email = ${email}`;
      if (result.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(result[0]);
    }

    return NextResponse.json(
      { error: 'User ID or email is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, userId, full_name, phone, addresses } = body;

    const finalId = id || userId;

    if (!finalId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE users
      SET
        full_name = COALESCE(${full_name}, full_name),
        phone = COALESCE(${phone}, phone),
        addresses = COALESCE(${addresses ? JSON.stringify(addresses) : null}, addresses),
        updated_at = NOW()
      WHERE id = ${finalId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
