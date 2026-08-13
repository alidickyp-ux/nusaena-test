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
    const { reference, box_id, box_number, weight, volume, site, store_name, address, city, province, brand } = body;

    if (!reference) {
      return NextResponse.json(
        { success: false, message: 'Reference wajib diisi' },
        { status: 400 }
      );
    }

    const finalBoxId = (box_id && box_id.trim() !== '') ? box_id.trim() : reference;
    const finalBoxNumber = ((box_number && box_number.trim() !== '') ? box_number.trim() : reference).slice(0, 50);

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

    const finalBrand = (brand && brand.trim() !== '') ? brand.trim() : null;

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
        brand,
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
        ${finalBrand},
        ${userSession.sub}::UUID,
        'staging'
      )
      RETURNING id, reference, box_id, box_number, weight, volume, site, store_name, address, city, province, brand, loading_status
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

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');
    const reference = searchParams.get('reference');

    if (!id && !reference) {
      return NextResponse.json(
        { success: false, message: 'Parameter id atau reference wajib disertakan' },
        { status: 400 }
      );
    }

    let result;

    if (id) {
      result = await sql`
        UPDATE b2b_putaway
        SET deleted_at = NOW()
        WHERE id = ${id}::UUID
        AND deleted_at IS NULL
        RETURNING id, reference, loading_status
      `;
    } else {
      result = await sql`
        UPDATE b2b_putaway
        SET deleted_at = NOW()
        WHERE reference = ${reference}
        AND delivery_number IS NULL
        AND loading_status = 'staging'
        AND deleted_at IS NULL
        RETURNING id, reference, loading_status
      `;
    }

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `✅ ${result.length} data berhasil dihapus`,
      data: result,
    });

  } catch (error) {
    console.error('Error soft deleting putaway:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus data' },
      { status: 500 }
    );
  }
}