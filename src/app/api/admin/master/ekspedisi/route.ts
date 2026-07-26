import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── GET ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    const vendors = q
      ? await sql`
          SELECT id, vendor_name, weight_price, volume_price, is_active, created_at, updated_at
          FROM master_ekspedisi
          WHERE vendor_name ILIKE ${'%' + q + '%'}
          ORDER BY vendor_name ASC
        `
      : await sql`
          SELECT id, vendor_name, weight_price, volume_price, is_active, created_at, updated_at
          FROM master_ekspedisi
          ORDER BY vendor_name ASC
        `;

    return NextResponse.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Error fetching master ekspedisi:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch master ekspedisi' },
      { status: 500 }
    );
  }
}

// ─── POST ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { vendor_name, weight_price, volume_price, is_active } = body;

    if (!vendor_name || vendor_name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Vendor Name wajib diisi' },
        { status: 400 }
      );
    }

    const cleanName = vendor_name.trim();

    try {
      const result = await sql`
        INSERT INTO master_ekspedisi (
          vendor_name, weight_price, volume_price, is_active
        ) VALUES (
          ${cleanName},
          ${weight_price !== undefined ? weight_price : 0},
          ${volume_price !== undefined ? volume_price : 0},
          ${is_active !== undefined ? is_active : true}
        )
        RETURNING id, vendor_name, weight_price, volume_price, is_active, created_at, updated_at
      `;

      return NextResponse.json({
        success: true,
        message: '✅ Ekspedisi berhasil ditambahkan',
        data: result[0],
      });
    } catch (dbError: any) {
      // Unique constraint violation
      if (dbError?.code === '23505') {
        return NextResponse.json(
          { success: false, message: `Vendor "${cleanName}" sudah terdaftar` },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating master ekspedisi:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create master ekspedisi' },
      { status: 500 }
    );
  }
}