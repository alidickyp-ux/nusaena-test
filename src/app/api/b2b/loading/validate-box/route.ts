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

    // 🔥 Cari box_id di salah satu reference yang sedang dipilih — SATU query pakai
    // reference = ANY(...) menggantikan loop per-reference. box_id unik di seluruh
    // tabel (dijaga di endpoint scan), jadi cukup 1 row yang match; tetap urutkan
    // sesuai posisi reference di array supaya perilaku "reference pertama yang cocok
    // yang dipakai" persis sama seperti versi loop.
    const boxMatches = await sql`
      SELECT 
        id,
        reference,
        box_id,
        loading_status,
        vendor_name
      FROM b2b_putaway
      WHERE box_id = ${box_id}
        AND reference = ANY(${references})
        AND (vendor_name IS NULL OR vendor_name = ${vendor_name})
    `;

    const matchedRow = references
      .map((ref) => boxMatches.find((row: any) => row.reference === ref))
      .find((row: any) => row !== undefined) || null;

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

    // 🔥 Hitung sisa box staging untuk SEMUA reference yang sedang dipilih bareng
    // sekaligus (matchedReference sudah pasti termasuk di `references`) — SATU query
    // GROUP BY menggantikan 2 query terpisah (remainingForRef + loop batchRemaining)
    const remainingByRef = await sql`
      SELECT reference, COUNT(*) as count
      FROM b2b_putaway
      WHERE reference = ANY(${references})
        AND loading_status = 'staging'
      GROUP BY reference
    `;

    const remainingMap = new Map<string, number>(
      remainingByRef.map((r: any) => [r.reference, Number(r.count)])
    );

    const remainingForRefCount = remainingMap.get(matchedReference) || 0;
    const refDone = remainingForRefCount === 0;

    const batchRemaining = references.reduce(
      (sum, ref) => sum + (remainingMap.get(ref) || 0),
      0
    );

    // 🔥 Kalau reference ini sudah selesai semua, samakan vendor_name di sisa baris (kalau ada yang masih NULL)
    if (refDone) {
      await sql`
        UPDATE b2b_putaway
        SET vendor_name = ${vendor_name}
        WHERE reference = ${matchedReference}
          AND vendor_name IS NULL
      `;
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