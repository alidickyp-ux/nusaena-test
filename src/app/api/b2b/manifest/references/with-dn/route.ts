// src/app/api/b2b/manifest/references/with-dn/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '25', 10));
    const offset = (page - 1) * limit;
    const search = (searchParams.get('search') || '').trim();
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const resiFilter = (searchParams.get('resi') || '').trim();
    const invoiceFilter = (searchParams.get('invoice') || '').trim();

    // =============================================
    // 🔥 BANGUN WHERE CLAUSE DINAMIS
    // =============================================
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      const p = `%${search}%`;
      conditions.push(`
        (mo.delivery_number ILIKE $${paramIndex} OR
         mo.vendor_name ILIKE $${paramIndex} OR
         mr.reference ILIKE $${paramIndex} OR
         mr.resi_number ILIKE $${paramIndex} OR
         mr.invoice_number ILIKE $${paramIndex} OR
         mr.delivered_status ILIKE $${paramIndex} OR
         pa.store_name ILIKE $${paramIndex})
      `);
      params.push(p);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`mo.loading_date::DATE >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`mo.loading_date::DATE <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (resiFilter) {
      conditions.push(`mr.resi_number ILIKE $${paramIndex}`);
      params.push(`%${resiFilter}%`);
      paramIndex++;
    }

    if (invoiceFilter) {
      conditions.push(`mr.invoice_number ILIKE $${paramIndex}`);
      params.push(`%${invoiceFilter}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // =============================================
    // 🔥 BASE CTE (dipakai bersama oleh query data & summary)
    // =============================================
    const baseCte = `
      WITH putaway_agg AS (
        SELECT reference, MAX(store_name) as store_name, MAX(site) as site, MAX(brand) as brand
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
          mr.invoice_number,
          mr.delivered_status,
          mr.arrive_date,
          mr.created_at,
          mr.updated_at,
          mo.delivery_number,
          mo.vendor_name,
          mo.loading_date,
          TRUE as has_dn,
          pa.store_name,
          pa.site,
          pa.brand
        FROM manifest_reference mr
        INNER JOIN manifest_order mo ON mo.id = mr.manifest_id
        LEFT JOIN putaway_agg pa ON pa.reference = mr.reference
        ${whereClause}
      )
    `;

    // =============================================
    // 🔥 QUERY 1: DATA PAGINATED
    // =============================================
    const dataQuery = `
      ${baseCte}
      SELECT *, COUNT(*) OVER() as total_count
      FROM base
      ORDER BY delivery_number ASC, reference ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const rows = await sql(dataQuery, [...params, limit, offset]);

    const totalCount =
      rows.length > 0 ? Number((rows[0] as any).total_count) : 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const data = rows.map(({ total_count, ...rest }: any) => rest);

    // =============================================
    // 🔥 QUERY 2: SUMMARY (dari SEMUA data, bukan hanya halaman)
    // =============================================
    const summaryQuery = `
      ${baseCte}
      SELECT
        COUNT(*) FILTER (WHERE delivered_status = 'arrived') AS arrived,
        COUNT(*) FILTER (WHERE delivered_status IS DISTINCT FROM 'arrived') AS on_shipping,
        COUNT(*) AS total_reference
      FROM base
    `;

    const summaryRows = await sql(summaryQuery, params);

    const summary = {
      arrived: Number((summaryRows[0] as any)?.arrived || 0),
      on_shipping: Number((summaryRows[0] as any)?.on_shipping || 0),
      total_reference: Number((summaryRows[0] as any)?.total_reference || 0),
    };

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, totalCount, totalPages },
      summary, // 🔥 BARU
    });
  } catch (error) {
    console.error('Error fetching references with DN:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch references',
      },
      { status: 500 }
    );
  }
}