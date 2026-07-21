import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 🔥 POST: Ambil gabungan box dari BEBERAPA reference sekaligus, dipakai
// setelah operator centang beberapa reference di layar "Pilih Reference"
// lalu tekan "OK" — semua box dari reference-reference itu ditampilkan
// jadi satu daftar untuk discan/divalidasi bareng.
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
    const { vendor_name, references } = body;

    if (!vendor_name || !Array.isArray(references) || references.length === 0) {
      return NextResponse.json(
        { success: false, message: 'vendor_name dan references wajib diisi' },
        { status: 400 }
      );
    }

    // 🔥 Loop per reference (bukan pakai ANY($1)) — konsisten dengan pola query
    // lain di project ini (lihat /api/b2b/handover), dan lebih aman untuk
    // driver sql tagged-template yang dipakai.
    let boxes: any[] = [];
    for (const ref of references) {
      const rows = await sql`
        SELECT 
          bp.id,
          bp.reference,
          bp.box_id,
          bp.box_number,
          bp.weight,
          bp.loading_status
        FROM b2b_putaway bp
        WHERE bp.reference = ${ref}
          AND (bp.vendor_name IS NULL OR bp.vendor_name = ${vendor_name})
        ORDER BY bp.created_at ASC
      `;
      boxes = boxes.concat(rows);
    }

    const stagingCount = boxes.filter((b) => b.loading_status === 'staging').length;

    return NextResponse.json({
      success: true,
      data: {
        references,
        boxes,
        total_box: boxes.length,
        staging_box: stagingCount,
      },
    });

  } catch (error) {
    console.error('Error fetching references boxes:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch references boxes' },
      { status: 500 }
    );
  }
}
