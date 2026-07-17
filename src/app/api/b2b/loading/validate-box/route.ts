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
    const { reference, box_id, vendor_name } = body;

    if (!reference || !box_id || !vendor_name) {
      return NextResponse.json(
        { success: false, message: 'Reference, box_id, and vendor_name are required' },
        { status: 400 }
      );
    }

    // 🔥 Cek box_id di putaway
    const boxCheck = await sql`
      SELECT 
        id,
        reference,
        box_id,
        loading_status,
        vendor_name
      FROM b2b_putaway
      WHERE box_id = ${box_id}
        AND reference = ${reference}
        AND (vendor_name IS NULL OR vendor_name = ${vendor_name})
    `;

    if (boxCheck.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Box tidak ditemukan di reference ini' },
        { status: 404 }
      );
    }

    if (boxCheck[0].loading_status === 'loading_complete') {
      return NextResponse.json(
        { success: false, message: 'Box sudah di-loading sebelumnya' },
        { status: 400 }
      );
    }

    // 🔥 UPDATE: loading_status = 'loading_complete' DAN vendor_name = nama vendor
    await sql`
      UPDATE b2b_putaway
      SET 
        loading_status = 'loading_complete',
        loading_at = NOW(),
        loading_by = ${userSession.sub}::UUID,
        vendor_name = ${vendor_name}
      WHERE id = ${boxCheck[0].id}
    `;

    // 🔥 Hitung sisa box yang masih staging di reference ini
    const remaining = await sql`
      SELECT COUNT(*) as count
      FROM b2b_putaway
      WHERE reference = ${reference}
        AND loading_status = 'staging'
    `;

    // 🔥 Cek apakah semua box sudah loading complete
    const allDone = Number(remaining[0].count) === 0;

    // 🔥 Jika semua box selesai, update semua box di reference ini dengan vendor_name yang sama
    if (allDone) {
      await sql`
        UPDATE b2b_putaway
        SET vendor_name = ${vendor_name}
        WHERE reference = ${reference}
          AND vendor_name IS NULL
      `;
    }

    return NextResponse.json({
      success: true,
      message: '✅ Box berhasil divalidasi',
      box_id: box_id,
      vendor_name: vendor_name,
      remaining: Number(remaining[0].count),
      all_done: allDone,
    });

  } catch (error) {
    console.error('Error validating box:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to validate box' },
      { status: 500 }
    );
  }
}