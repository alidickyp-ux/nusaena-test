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
    const { box_id, vendor_name } = body;
    // 🔥 references: array of reference yang sedang di-loading bareng (multi-select).
    // Tetap terima `reference` tunggal untuk kompatibilitas kalau ada pemanggil lama.
    const references: string[] = Array.isArray(body.references)
      ? body.references
      : (body.reference ? [body.reference] : []);

    if (!box_id || !vendor_name || references.length === 0) {
      return NextResponse.json(
        { success: false, message: 'box_id, vendor_name, dan references are required' },
        { status: 400 }
      );
    }

    // 🔥 Cari box_id di salah satu reference yang sedang dipilih
    let matchedRow: any = null;
    for (const ref of references) {
      const boxCheck = await sql`
        SELECT 
          id,
          reference,
          box_id,
          loading_status,
          vendor_name
        FROM b2b_putaway
        WHERE box_id = ${box_id}
          AND reference = ${ref}
          AND (vendor_name IS NULL OR vendor_name = ${vendor_name})
      `;
      if (boxCheck.length > 0) {
        matchedRow = boxCheck[0];
        break;
      }
    }

    if (!matchedRow) {
      return NextResponse.json(
        { success: false, message: 'Box tidak ditemukan di reference yang dipilih' },
        { status: 404 }
      );
    }

    if (matchedRow.loading_status === 'loading_complete') {
      return NextResponse.json(
        { success: false, message: 'Box sudah di-loading sebelumnya' },
        { status: 400 }
      );
    }

    const matchedReference = matchedRow.reference;

    // 🔥 UPDATE: loading_status = 'loading_complete' DAN vendor_name = nama vendor
    await sql`
      UPDATE b2b_putaway
      SET 
        loading_status = 'loading_complete',
        loading_at = NOW(),
        loading_by = ${userSession.sub}::UUID,
        vendor_name = ${vendor_name}
      WHERE id = ${matchedRow.id}
    `;

    // 🔥 Hitung sisa box staging untuk reference yang box ini berasal darinya
    const remainingForRef = await sql`
      SELECT COUNT(*) as count
      FROM b2b_putaway
      WHERE reference = ${matchedReference}
        AND loading_status = 'staging'
    `;
    const refDone = Number(remainingForRef[0].count) === 0;

    // 🔥 Kalau reference ini sudah selesai semua, samakan vendor_name di sisa baris (kalau ada yang masih NULL)
    if (refDone) {
      await sql`
        UPDATE b2b_putaway
        SET vendor_name = ${vendor_name}
        WHERE reference = ${matchedReference}
          AND vendor_name IS NULL
      `;
    }

    // 🔥 Hitung sisa box staging untuk SEMUA reference yang sedang dipilih bareng (batch)
    let batchRemaining = 0;
    for (const ref of references) {
      const r = await sql`
        SELECT COUNT(*) as count
        FROM b2b_putaway
        WHERE reference = ${ref}
          AND loading_status = 'staging'
      `;
      batchRemaining += Number(r[0].count);
    }

    return NextResponse.json({
      success: true,
      message: '✅ Box berhasil divalidasi',
      box_id: box_id,
      vendor_name: vendor_name,
      matched_reference: matchedReference,
      reference_done: refDone,
      remaining: batchRemaining,
      all_done: batchRemaining === 0,
    });

  } catch (error) {
    console.error('Error validating box:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to validate box' },
      { status: 500 }
    );
  }
}
