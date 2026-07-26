import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 🔥 GET: List semua master store, dengan search opsional (?q=...) di site/store_name/city
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    const stores = q
      ? await sql`
          SELECT id, site, store_name, address, city, province, brand, is_active, created_at, updated_at
          FROM master_store
          WHERE site ILIKE ${'%' + q + '%'}
             OR store_name ILIKE ${'%' + q + '%'}
             OR city ILIKE ${'%' + q + '%'}
          ORDER BY site ASC
        `
      : await sql`
          SELECT id, site, store_name, address, city, province, brand, is_active, created_at, updated_at
          FROM master_store
          ORDER BY site ASC
        `;

    return NextResponse.json({ success: true, data: stores });
  } catch (error) {
    console.error('Error fetching master store:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch master store' },
      { status: 500 }
    );
  }
}

// 🔥 POST: Tambah store baru — hanya ADMIN
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
    const { site, store_name, address, city, province, brand, is_active } = body;

    if (!site || !store_name) {
      return NextResponse.json(
        { success: false, message: 'Site dan Store Name wajib diisi' },
        { status: 400 }
      );
    }

    const cleanSite = String(site).trim();

    try {
      const result = await sql`
        INSERT INTO master_store (
          site, store_name, address, city, province, brand, is_active
        ) VALUES (
          ${cleanSite},
          ${String(store_name).trim()},
          ${address || null},
          ${city || null},
          ${province || null},
          ${brand || null},
          ${is_active !== undefined ? is_active : true}
        )
        RETURNING id, site, store_name, address, city, province, brand, is_active, created_at, updated_at
      `;

      return NextResponse.json({
        success: true,
        message: '✅ Store berhasil ditambahkan',
        data: result[0],
      });
    } catch (dbError: any) {
      // 🔥 Unique constraint master_store_site_key
      if (dbError?.code === '23505') {
        return NextResponse.json(
          { success: false, message: `Site "${cleanSite}" sudah terdaftar` },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating master store:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create master store' },
      { status: 500 }
    );
  }
}