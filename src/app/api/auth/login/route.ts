import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { signSession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi.' }, { status: 400 });
    }

    const rows = await sql`
      SELECT id, username, password_hash, full_name, role, is_active
      FROM users
      WHERE username = ${username.trim().toLowerCase()}
      LIMIT 1
    `;

    const user = rows[0];

    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 });
    }

    const token = await signSession({
      sub: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      role: user.role,
      full_name: user.full_name,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 jam, samakan dengan expiry JWT
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
