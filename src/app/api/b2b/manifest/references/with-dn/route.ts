import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '25', 10));
    const offset = (page - 1) * limit;
    const search = (searchParams.get('search') || '').trim();
    const pattern = `%${search}%`;

    // 🔥 Search & pagination dilakukan di level SQL, bukan di client
    // 🔥 LEFT JOIN ke b2b_putaway (aggregated) untuk ambil store_name berdasarkan reference yang sama
    const rows = await sql`
      WITH putaway_agg AS (
        SELECT reference, MAX(store_name) as store_name, MAX(site) as site
        FROM b2b_putaway
        WHERE deleted_at IS NULL
        GROUP BY reference
      ),
      base AS (
        SELECT 
          mr.id,
          mr.manifest_id,
          mr.reference,
          mr.resi_number,
          mr.delivered_status,
          mr.arrive_date,
          mr.created_at,
          mr.updated_at,
          mo.delivery_number,
          mo.vendor_name,
          mo.loading_date,
          TRUE as has_dn,
          pa.store_name,
          pa.site
        FROM manifest_reference mr
        INNER JOIN manifest_order mo ON mo.id = mr.manifest_id
        LEFT JOIN putaway_agg pa ON pa.reference = mr.reference
        WHERE (
          mo.delivery_number ILIKE ${pattern} OR
          mr.reference ILIKE ${pattern} OR
          mr.resi_number ILIKE ${pattern} OR
          mr.delivered_status ILIKE ${pattern} OR
          pa.store_name ILIKE ${pattern}
        )
      )
      SELECT *, COUNT(*) OVER() as total_count
      FROM base
      ORDER BY delivery_number ASC, reference ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalCount = rows.length > 0 ? Number((rows[0] as any).total_count) : 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const data = rows.map(({ total_count, ...rest }: any) => rest);

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, totalCount, totalPages },
    });

  } catch (error) {
    console.error('Error fetching references with DN:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch references' },
      { status: 500 }
    );
  }
}