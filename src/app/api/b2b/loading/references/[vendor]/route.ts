import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { vendor: string } }
) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    const vendor = decodeURIComponent(params.vendor);

    // 🔥 Cari semua reference yang relevan untuk vendor ini:
    // - masih ada box berstatus 'staging' (perlu di-loading), ATAU
    // - sudah 100% loading_complete tapi BELUM di-handover final (delivery_number masih NULL)
    //   sehingga tetap muncul dengan badge "Selesai" dan bisa dipilih untuk handover.
    // Filter row-level ke 'staging' saja (versi lama) salah: begitu satu reference
    // 100% selesai, SEMUA barisnya jadi loading_complete → tidak ada baris tersisa
    // yang match, jadi reference itu langsung hilang dari daftar, bukan tampil
    // dengan status selesai. Sekarang filter dipindah ke tingkat reference (HAVING),
    // dan agregat dihitung dari SEMUA baris reference tsb, bukan hanya yang staging.
    const references = await sql`
      SELECT 
        reference,
        COUNT(*) as total_box,
        COALESCE(SUM(weight::DECIMAL), 0) as total_weight,
        COUNT(CASE WHEN loading_status = 'loading_complete' THEN 1 END) as loaded_box,
        COUNT(CASE WHEN loading_status = 'staging' THEN 1 END) as staging_box,
        MIN(putaway_at) as putaway_at
      FROM b2b_putaway
      WHERE delivery_number IS NULL
        AND (
          vendor_name IS NULL 
          OR vendor_name = ${vendor}
        )
      GROUP BY reference
      HAVING 
        COUNT(CASE WHEN loading_status = 'staging' THEN 1 END) > 0
        OR COUNT(CASE WHEN loading_status = 'loading_complete' THEN 1 END) = COUNT(*)
      ORDER BY reference ASC
    `;

    return NextResponse.json({
      success: true,
      data: {
        vendor,
        references: references || [],
      },
    });

  } catch (error) {
    console.error('Error fetching references:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch references' },
      { status: 500 }
    );
  }
}