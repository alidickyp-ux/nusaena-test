import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// 🔥 POST: Buat entri b2b_putaway secara MANUAL dari admin panel.
// Beda dari /api/b2b/putaway/scan-box (yang mem-parse box_id hasil scan
// barcode fisik) — di sini tidak ada barcode untuk di-parse, jadi
// box_id/box_number dibuat otomatis, dan weight/volume diisi manual
// (keduanya opsional).
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { reference, site, weight, volume } = body;

    if (!reference || !site) {
      return NextResponse.json(
        { success: false, message: 'Reference dan Site wajib diisi' },
        { status: 400 }
      );
    }

    // 🔥 box_id dibuat otomatis (bukan hasil scan barcode fisik) — harus
    // tetap unik karena kolom box_id di-cek unik di scan-box juga.
    const boxId = `MANUAL-${reference}-${Date.now()}`;
    const boxNumber = boxId.slice(0, 14);

    // 🔥 Ambil data store dari master_store berdasarkan site — kalau
    // ketemu, address/store_name/city/province auto-fill. Kalau site
    // belum terdaftar di master_store, biarkan kosong (null) supaya
    // bisa diisi manual belakangan lewat "Edit Ship To".
    const storeData = await sql`
      SELECT store_name, address, city, province
      FROM master_store
      WHERE site = ${site} AND is_active = true
      LIMIT 1
    `;
    const store = storeData[0] || {};

    const result = await sql`
      INSERT INTO b2b_putaway (
        reference,
        box_id,
        box_number,
        weight,
        volume,
        site,
        store_name,
        address,
        city,
        province,
        putaway_by,
        loading_status
      ) VALUES (
        ${reference},
        ${boxId},
        ${boxNumber},
        ${weight || null},
        ${volume || null},
        ${site},
        ${store.store_name || null},
        ${store.address || null},
        ${store.city || null},
        ${store.province || null},
        ${userSession.sub}::UUID,
        'staging'
      )
      RETURNING id, reference, box_id, box_number, weight, volume, site, store_name, address, city, province, loading_status
    `;

    return NextResponse.json({
      success: true,
      message: '✅ Reference berhasil dibuat',
      data: result[0],
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating manual putaway:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create putaway entry' },
      { status: 500 }
    );
  }
}