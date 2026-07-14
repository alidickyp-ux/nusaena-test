import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';


// GET: Ambil semua 3PL aktif
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Ambil semua 3PL yang aktif
    const transporters = await sql`
      SELECT 
        id,
        transporter_name,
        transporter_code,
        is_active,
        notes
      FROM public.master_3pl
      WHERE is_active = true
      ORDER BY transporter_name ASC
    `;

    return NextResponse.json({
      success: true,
      data: transporters,
    });

  } catch (error) {
    console.error('Error fetching 3PL:', error);
    return NextResponse.json(
      { error: 'Failed to fetch 3PL' },
      { status: 500 }
    );
  }
}

// POST: Tambah 3PL baru (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication & admin role
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { transporter_name, transporter_code, is_active, notes } = body;

    if (!transporter_name || !transporter_code) {
      return NextResponse.json(
        { error: 'Transporter name and code are required' },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await sql`
      SELECT id FROM master_3pl 
      WHERE transporter_code = ${transporter_code}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Transporter code already exists' },
        { status: 409 }
      );
    }

    // Insert new 3PL
    const result = await sql`
      INSERT INTO master_3pl (transporter_name, transporter_code, is_active, notes)
      VALUES (${transporter_name}, ${transporter_code}, ${is_active !== undefined ? is_active : true}, ${notes || null})
      RETURNING id, transporter_name, transporter_code, is_active, notes
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating 3PL:', error);
    return NextResponse.json(
      { error: 'Failed to create 3PL' },
      { status: 500 }
    );
  }
}