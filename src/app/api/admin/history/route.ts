import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import {
  parseDateParam,
  parseEnumParam,
  parsePagination,
  toLikePattern,
} from '@/lib/api-params';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUSES = ['DONE', 'CANCELLED', 'NOT_FOUND'] as const;

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = parsePagination(searchParams);

    // Semua filter bernilai null kalau tidak dipakai, sehingga cukup satu query statis.
    const pattern = toLikePattern(searchParams.get('search'));
    const isInstantParam = searchParams.get('is_instant');
    const isInstant = isInstantParam === 'true' ? true : isInstantParam === 'false' ? false : null;
    const status = parseEnumParam(searchParams.get('status'), STATUSES);
    const dateFrom = parseDateParam(searchParams.get('date_from'));
    const dateTo = parseDateParam(searchParams.get('date_to'));

    const [rows, statsRows] = await Promise.all([
      sql`
        SELECT h.*, (COUNT(*) OVER())::int AS total_count
        FROM history_logs h
        WHERE (${pattern}::text IS NULL
                OR h.resi_number ILIKE ${pattern}::text
                OR h.session_code ILIKE ${pattern}::text
                OR h.transporter_name ILIKE ${pattern}::text)
          AND (${isInstant}::boolean IS NULL OR h.is_instant = ${isInstant}::boolean)
          AND (${status}::text IS NULL OR h.status = ${status}::text)
          AND (${dateFrom}::date IS NULL
                OR h.handover_at >= (${dateFrom}::date::timestamp AT TIME ZONE 'Asia/Jakarta'))
          AND (${dateTo}::date IS NULL
                OR h.handover_at < ((${dateTo}::date + 1)::timestamp AT TIME ZONE 'Asia/Jakarta'))
        ORDER BY h.handover_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      // Statistik mengikuti rentang tanggal saja (tidak ikut search / status / tipe),
      // supaya kartu statistik tetap bisa dipakai sebagai pintasan filter.
      sql`
        SELECT
          COUNT(*)::int AS total,
          (COUNT(*) FILTER (WHERE status = 'DONE'))::int AS done,
          (COUNT(*) FILTER (WHERE status = 'CANCELLED'))::int AS cancelled,
          (COUNT(*) FILTER (WHERE status = 'NOT_FOUND'))::int AS not_found,
          (COUNT(*) FILTER (WHERE is_instant = true))::int AS instant,
          (COUNT(*) FILTER (WHERE is_instant = false))::int AS regular
        FROM history_logs
        WHERE (${dateFrom}::date IS NULL
                OR handover_at >= (${dateFrom}::date::timestamp AT TIME ZONE 'Asia/Jakarta'))
          AND (${dateTo}::date IS NULL
                OR handover_at < ((${dateTo}::date + 1)::timestamp AT TIME ZONE 'Asia/Jakarta'))
      `,
    ]);

    const total: number = rows[0]?.total_count ?? 0;
    const totalPages = Math.ceil(total / limit);
    const data = rows.map(({ total_count, ...row }: Record<string, unknown>) => row);

    const stats = statsRows[0] ?? {
      total: 0,
      done: 0,
      cancelled: 0,
      not_found: 0,
      instant: 0,
      regular: 0,
    };

    return NextResponse.json({
      success: true,
      data,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}