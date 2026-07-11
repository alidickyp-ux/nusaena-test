import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

// PUT: Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id;
    const body = await request.json();
    const { full_name, role, is_active, password } = body;

    // Check if user exists
    const existingUser = await sql`
      SELECT id, full_name, role, is_active FROM users WHERE id = ${userId}
    `;

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build update query
    let result;
    
    if (password && password.length > 0) {
      // If password is provided, update everything including password
      const hashedPassword = await bcrypt.hash(password, 10);
      result = await sql`
        UPDATE users 
        SET 
          full_name = ${full_name || existingUser[0].full_name},
          role = ${role || existingUser[0].role},
          is_active = ${is_active !== undefined ? is_active : existingUser[0].is_active},
          password_hash = ${hashedPassword},
          updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, username, full_name, role, is_active, updated_at
      `;
    } else {
      // Update without password
      result = await sql`
        UPDATE users 
        SET 
          full_name = ${full_name || existingUser[0].full_name},
          role = ${role || existingUser[0].role},
          is_active = ${is_active !== undefined ? is_active : existingUser[0].is_active},
          updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, username, full_name, role, is_active, updated_at
      `;
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE: Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id;

    // Prevent deleting self
    if (userId === session.sub) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await sql`
      SELECT id FROM users WHERE id = ${userId}
    `;

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user
    await sql`
      DELETE FROM users WHERE id = ${userId}
    `;

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}