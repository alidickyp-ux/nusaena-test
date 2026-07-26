import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── PUT ──────────────────────────────────────────────────
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
        UPDATE master_ekspedisi
        SET
          vendor_name = ${cleanName},
          weight_price = ${weight_price !== undefined ? weight_price : 0},
          volume_price = ${volume_price !== undefined ? volume_price : 0},
          is_active = ${is_active !== undefined ? is_active : true},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, vendor_name, weight_price, volume_price, is_active, created_at, updated_at
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Ekspedisi tidak ditemukan' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '✅ Ekspedisi berhasil diupdate',
        data: result[0],
      });
    } catch (dbError: any) {
      if (dbError?.code === '23505') {
        return NextResponse.json(
          { success: false, message: `Vendor "${cleanName}" sudah dipakai` },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error updating master ekspedisi:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update master ekspedisi' },
      { status: 500 }
    );
  }
}

// ─── DELETE ──────────────────────────────────────────────
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
      DELETE FROM master_ekspedisi
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Ekspedisi tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '✅ Ekspedisi berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting master ekspedisi:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete master ekspedisi' },
      { status: 500 }
    );
  }
}