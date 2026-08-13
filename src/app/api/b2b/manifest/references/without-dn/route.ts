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

    const rows = await sql`
      WITH grouped AS (
        SELECT
          reference,
          MAX(putaway_at) as created_at,
          MAX(box_id) as box_id,
          MAX(site) as site,
          MAX(store_name) as store_name,
          MAX(address) as address,
          MAX(city) as city,
          MAX(province) as province,
          COUNT(*) as total_box
        FROM b2b_putaway
        WHERE delivery_number IS NULL
        AND loading_status = 'staging'
        AND deleted_at IS NULL
        GROUP BY reference
      )
      SELECT *, COUNT(*) OVER() as total_count
      FROM grouped
      WHERE (
        reference ILIKE ${pattern} OR
        store_name ILIKE ${pattern} OR
        site ILIKE ${pattern}
      )
      ORDER BY reference ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalCount = rows.length > 0 ? Number((rows[0] as any).total_count) : 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const data = rows.map(({ total_count, ...rest }: any) => ({
      ...rest,
      id: null,
      manifest_id: null,
      has_dn: false,
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, totalCount, totalPages },
    });

  } catch (error) {
    console.error('Error fetching references without DN:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch references' },
      { status: 500 }
    );
  }
}