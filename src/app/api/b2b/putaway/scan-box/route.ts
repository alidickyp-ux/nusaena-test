import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const { reference, box_id, site, staging_location } = body;

    if (!reference || !box_id || !site) {
      return NextResponse.json(
        { success: false, message: 'Reference, box_id, and site are required' },
        { status: 400 }
      );
    }

    // 🔥 Parse box_id
    // Format: PCB23-26002071BOX-01-15.6
    //   - box_number = token "BOX-01" (nomor box), BUKAN 14 karakter pertama
    //     (14 karakter pertama cuma kebetulan sama panjang dengan prefix
    //     "PCB23-26002071", itu bukan box number)
    //   - weight = angka di AKHIR string, setelah pemisah terakhir "-" atau "#"
    // Contoh lain yang harus tetap kebaca benar: "PCB23-26001234BOX01-15.6"
    // atau "PCB23-26002112BOX21#15.6"
    const weightMatch = box_id.match(/[-#]([\d.]+)$/);
    const weight = weightMatch ? weightMatch[1] : null;

    const boxNumberMatch = box_id.match(/(BOX-?\d+)(?=[-#][\d.]+$)/i);
    const boxNumber = boxNumberMatch ? boxNumberMatch[1] : box_id.slice(0, 50);

    // 🔥 Cek apakah box_id sudah ada
    const existingBox = await sql`
      SELECT id FROM b2b_putaway WHERE box_id = ${box_id}
    `;

    if (existingBox.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Box ID sudah pernah discan' },
        { status: 409 }
      );
    }

    // 🔥 Ambil data store dari master_store — site sekarang discan/diketik manual,
    // jadi pencocokan dibuat case-insensitive supaya tidak gagal cuma karena beda huruf besar/kecil
    const cleanSite = String(site).trim();
    const storeData = await sql`
      SELECT store_name, address, city, province
      FROM master_store
      WHERE UPPER(site) = UPPER(${cleanSite}) AND is_active = true
      LIMIT 1
    `;

    const store = storeData[0] || {};

    // 🔥 Insert ke b2b_putaway
    const result = await sql`
      INSERT INTO b2b_putaway (
        reference,
        box_id,
        box_number,
        weight,
        site,
        staging_location,
        store_name,
        address,
        city,
        province,
        putaway_by,
        loading_status
      ) VALUES (
        ${reference},
        ${box_id},
        ${boxNumber},
        ${weight},
        ${cleanSite},
        ${staging_location || null},
        ${store.store_name || null},
        ${store.address || null},
        ${store.city || null},
        ${store.province || null},
        ${userSession.sub}::UUID,
        'staging'
      )
      RETURNING id, reference, box_id, box_number, weight, site, staging_location, loading_status
    `;

    // 🔥 Hitung total box dalam reference
    const totalBox = await sql`
      SELECT COUNT(*) as count FROM b2b_putaway WHERE reference = ${reference}
    `;

    return NextResponse.json({
      success: true,
      message: '✅ Box berhasil discan',
      data: result[0],
      total_box: Number(totalBox[0].count),
    });

  } catch (error) {
    console.error('Error scanning box:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to scan box' },
      { status: 500 }
    );
  }
}