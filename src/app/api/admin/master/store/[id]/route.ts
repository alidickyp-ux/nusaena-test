import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 🔥 PUT: Update store berdasarkan id — hanya ADMIN
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const id = Number(params.id);
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID tidak valid' }, { status: 400 });
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
        UPDATE master_store
        SET
          site = ${cleanSite},
          store_name = ${String(store_name).trim()},
          address = ${address || null},
          city = ${city || null},
          province = ${province || null},
          brand = ${brand || null},
          is_active = ${is_active !== undefined ? is_active : true},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, site, store_name, address, city, province, brand, is_active, created_at, updated_at
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Store tidak ditemukan' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '✅ Store berhasil diupdate',
        data: result[0],
      });
    } catch (dbError: any) {
      // 🔥 Unique constraint master_store_site_key
      if (dbError?.code === '23505') {
        return NextResponse.json(
          { success: false, message: `Site "${cleanSite}" sudah dipakai store lain` },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error updating master store:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update master store' },
      { status: 500 }
    );
  }
}

// 🔥 DELETE: Hapus store berdasarkan id — hanya ADMIN
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const id = Number(params.id);
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID tidak valid' }, { status: 400 });
    }

    const result = await sql`
      DELETE FROM master_store
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Store tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '✅ Store berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting master store:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete master store' },
      { status: 500 }
    );
  }
}