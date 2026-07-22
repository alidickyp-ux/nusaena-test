import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// 🔥 POST: Buat entri b2b_putaway secara MANUAL dari admin panel.
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
    const { reference, box_id, box_number, weight, volume, site, store_name, address, city, province } = body;

    if (!reference) {
      return NextResponse.json(
        { success: false, message: 'Reference wajib diisi' },
        { status: 400 }
      );
    }

    // 🔥 Jika box_id tidak diisi, gunakan reference sebagai box_id
    // 🔥 Jika box_number tidak diisi, gunakan reference sebagai box_number
    const finalBoxId = (box_id && box_id.trim() !== '') ? box_id.trim() : reference;
    const finalBoxNumber = (box_number && box_number.trim() !== '') ? box_number.trim() : reference;

    // 🔥 Ambil data store dari master_store berdasarkan site — kalau
    // ketemu, address/store_name/city/province auto-fill.
    const cleanSite = (site && site.trim() !== '') ? site.trim() : null;
    let store = {};
    if (cleanSite) {
      const storeData = await sql`
        SELECT store_name, address, city, province
        FROM master_store
        WHERE UPPER(site) = UPPER(${cleanSite}) AND is_active = true
        LIMIT 1
      `;
      store = storeData[0] || {};
    }

    // 🔥 Gunakan nilai dari form jika ada, fallback ke store data, atau null
    const finalStoreName = (store_name && store_name.trim() !== '') 
      ? store_name.trim() 
      : (store as any).store_name || null;
    const finalAddress = (address && address.trim() !== '') 
      ? address.trim() 
      : (store as any).address || null;
    const finalCity = (city && city.trim() !== '') 
      ? city.trim() 
      : (store as any).city || null;
    const finalProvince = (province && province.trim() !== '') 
      ? province.trim() 
      : (store as any).province || null;

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
        ${finalBoxId},
        ${finalBoxNumber},
        ${weight || null},
        ${volume || null},
        ${cleanSite},
        ${finalStoreName},
        ${finalAddress},
        ${finalCity},
        ${finalProvince},
        ${userSession.sub}::UUID,
        'staging'
      )
      RETURNING id, reference, box_id, box_number, weight, volume, site, store_name, address, city, province, loading_status
    `;

    return NextResponse.json({
      success: true,
      message: '✅ Box berhasil dibuat',
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