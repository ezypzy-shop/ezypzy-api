import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, login_method, firebase_uid, name } = body;
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Request body:', JSON.stringify(body, null, 2));
    console.log('Email:', email);
    console.log('Login method:', login_method);
    console.log('Firebase UID:', firebase_uid);
    console.log('Has password:', !!password);
    
    // CASE 1: Firebase authentication (with firebase_uid)
    // Just sync the user in the database, no password check needed
    if (firebase_uid) {
      console.log('🔥 Firebase authentication flow - syncing user...');
      
      // Check if user exists by firebase_uid
      let users = await sql`SELECT * FROM users WHERE firebase_uid = ${firebase_uid}`;
      
      // If not found by firebase_uid, check by email
      if (users.length === 0 && email) {
        console.log('No user found by firebase_uid, checking by email...');
        users = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email})`;
      }
      
      let user;
      
      if (users.length === 0) {
        // Create new user
        console.log('Creating new user in database...');
        const newUsers = await sql`
          INSERT INTO users (email, name, firebase_uid, login_method)
          VALUES (${email}, ${name || email.split('@')[0]}, ${firebase_uid}, 'email')
          RETURNING *
        `;
        user = newUsers[0];
        console.log('✅ User created successfully - ID:', user.id, 'Email:', user.email);
      } else {
        user = users[0];
        
        // Update firebase_uid if it wasn't set before
        if (!user.firebase_uid) {
          console.log('Updating existing user with Firebase UID...');
          const updated = await sql`
            UPDATE users 
            SET firebase_uid = ${firebase_uid}, login_method = 'email'
            WHERE id = ${user.id}
            RETURNING *
          `;
          user = updated[0];
        }
        
        console.log('✅ User found - ID:', user.id, 'Name:', user.name, 'Email:', user.email);
      }
      
      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar_url: user.avatar_url,
          login_method: user.login_method,
          is_business_user: user.is_business_user
        }
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
    
    console.log('❌ No firebase_uid provided, falling back to legacy auth...');
    
    // CASE 2: Legacy email/password authentication (backward compatibility)
    if (!email) {
      return NextResponse.json({ 
        error: 'Please enter your email address' 
      }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
    
    // Get user by email (case-insensitive comparison)
    const users = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email})`;
    
    if (users.length === 0) {
      console.log('❌ User not found');
      return NextResponse.json({ 
        error: 'No account found with this email address. Please check your email or create a new account.' 
      }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    }
    
    const user = users[0];
    console.log('✅ User found - ID:', user.id, 'Name:', user.name);
    
    // For social login, no password check needed
    if (login_method === 'google' || login_method === 'facebook') {
      console.log('✅ Social login - no password check needed');
      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar_url: user.avatar_url,
          login_method: user.login_method,
          is_business_user: user.is_business_user
        }
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
    
    // For email login, verify password (plain text comparison)
    if (!password) {
      console.log('❌ Password required but not provided');
      return NextResponse.json({ 
        error: 'Please enter your password' 
      }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
    
    console.log('Password check:');
    console.log('  Entered password:', password);
    console.log('  Stored password:', user.password_hash);
    console.log('  Match:', user.password_hash === password ? '✅' : '❌');
    
    if (user.password_hash !== password) {
      console.log('❌ Invalid password');
      return NextResponse.json({ 
        error: 'Incorrect password. Please try again or reset your password.' 
      }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
    
    console.log('✅ Login successful - returning user data');
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        login_method: user.login_method,
        is_business_user: user.is_business_user
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('❌ Error logging in:', error);
    return NextResponse.json({ 
      error: 'Something went wrong. Please try again.' 
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
