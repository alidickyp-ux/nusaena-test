import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';


// GET: List all users
export async function GET(request: NextRequest) {
  try {
    // Get session from cookie
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Query users from database
    const users = await sql`
      SELECT 
        id, 
        username, 
        full_name, 
        role, 
        is_active, 
        created_at, 
        updated_at
      FROM users
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ 
      success: true, 
      data: users 
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST: Create new user
export async function POST(request: NextRequest) {
  try {
    // Get session from cookie
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { username, full_name, password, role, is_active } = body;

    // Validate input
    if (!username || !full_name || !password) {
      return NextResponse.json(
        { error: 'Username, full name, and password are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE username = ${username}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const newUser = await sql`
      INSERT INTO users (username, full_name, password_hash, role, is_active)
      VALUES (${username}, ${full_name}, ${hashedPassword}, ${role || 'OPERATOR'}, ${is_active !== undefined ? is_active : true})
      RETURNING id, username, full_name, role, is_active, created_at
    `;

    return NextResponse.json({
      success: true,
      data: newUser[0],
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}