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

const SESSION_STATUSES = ['running', 'closed'] as const;
const SOURCES = ['sorting', 'instant'] as const;
const HANDOVERS = ['done', 'pending', 'discrepancy'] as const;

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
    const sessionStatusParam = parseEnumParam(searchParams.get('session_status'), SESSION_STATUSES);
    const sessionStatus = sessionStatusParam ? sessionStatusParam.toUpperCase() : null; // RUNNING | CLOSED
    const source = parseEnumParam(searchParams.get('source'), SOURCES);
    const handover = parseEnumParam(searchParams.get('handover'), HANDOVERS);
    const dateFrom = parseDateParam(searchParams.get('date_from'));
    const dateTo = parseDateParam(searchParams.get('date_to'));

    const [rows, sortingStats, instantStats] = await Promise.all([
      sql`
        SELECT combined.*, (COUNT(*) OVER())::int AS total_count
        FROM (
          SELECT
            sd.id::text AS id, sd.barcode_resi, sd.scanned_at, sd.is_validated_handover,
            sd.discrepancy_reason, sd.validated_at,
            ss.session_code, ss.status AS session_status,
            COALESCE(mt.transporter_name, '-') AS transporter_name,
            u.full_name AS sorting_by_name,
            'sorting' AS source_type, NULL::text AS instant_status
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          LEFT JOIN users u ON u.id = sd.sorting_by

          UNION ALL

          SELECT
            ip.id::text AS id, ip.barcode_resi, ip.putaway_at AS scanned_at,
            (ip.status = 'PICKED') AS is_validated_handover,
            NULL::text AS discrepancy_reason, ip.picked_at AS validated_at,
            TO_CHAR(ip.putaway_at AT TIME ZONE 'Asia/Jakarta', '"INST-"YYYY-MM-DD') AS session_code,
            'RUNNING' AS session_status, 'INSTANT' AS transporter_name,
            NULL::text AS sorting_by_name,
            'instant' AS source_type, ip.status AS instant_status
          FROM instant_packages ip
          WHERE ip.status IN ('STORED', 'PICKED')
        ) combined
        WHERE (${pattern}::text IS NULL
                OR combined.barcode_resi ILIKE ${pattern}::text
                OR combined.session_code ILIKE ${pattern}::text
                OR combined.transporter_name ILIKE ${pattern}::text)
          AND (${sessionStatus}::text IS NULL OR combined.session_status::text = ${sessionStatus}::text)
          AND (${source}::text IS NULL OR combined.source_type = ${source}::text)
          AND (${handover}::text IS NULL
                OR (${handover}::text = 'done' AND combined.is_validated_handover = true)
                OR (${handover}::text = 'pending' AND combined.is_validated_handover = false)
                OR (${handover}::text = 'discrepancy' AND combined.discrepancy_reason IS NOT NULL))
          AND (${dateFrom}::date IS NULL
                OR combined.scanned_at >= (${dateFrom}::date::timestamp AT TIME ZONE 'Asia/Jakarta'))
          AND (${dateTo}::date IS NULL
                OR combined.scanned_at < ((${dateTo}::date + 1)::timestamp AT TIME ZONE 'Asia/Jakarta'))
        ORDER BY combined.scanned_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      // Statistik mengikuti rentang tanggal saja (tidak ikut search / filter lain),
      // supaya kartu statistik tetap bisa dipakai sebagai pintasan filter.
      sql`
        SELECT
          COUNT(*)::int AS total,
          (COUNT(*) FILTER (WHERE sd.is_validated_handover = true))::int AS handed_over,
          (COUNT(*) FILTER (WHERE sd.is_validated_handover = false))::int AS pending,
          (COUNT(*) FILTER (WHERE sd.discrepancy_reason IS NOT NULL))::int AS discrepancy,
          (COUNT(*) FILTER (WHERE ss.status::text = 'RUNNING'))::int AS in_running_session
        FROM sorting_details sd
        JOIN sorting_sessions ss ON ss.id = sd.session_id
        WHERE (${dateFrom}::date IS NULL
                OR sd.scanned_at >= (${dateFrom}::date::timestamp AT TIME ZONE 'Asia/Jakarta'))
          AND (${dateTo}::date IS NULL
                OR sd.scanned_at < ((${dateTo}::date + 1)::timestamp AT TIME ZONE 'Asia/Jakarta'))
      `,
      sql`
        SELECT
          COUNT(*)::int AS total,
          (COUNT(*) FILTER (WHERE status = 'PICKED'))::int AS handed_over,
          (COUNT(*) FILTER (WHERE status = 'STORED'))::int AS pending
        FROM instant_packages
        WHERE status IN ('STORED', 'PICKED')
          AND (${dateFrom}::date IS NULL
                OR putaway_at >= (${dateFrom}::date::timestamp AT TIME ZONE 'Asia/Jakarta'))
          AND (${dateTo}::date IS NULL
                OR putaway_at < ((${dateTo}::date + 1)::timestamp AT TIME ZONE 'Asia/Jakarta'))
      `,
    ]);

    const total: number = rows[0]?.total_count ?? 0;
    const totalPages = Math.ceil(total / limit);
    const data = rows.map(({ total_count, ...row }: Record<string, unknown>) => row);

    const sStats = sortingStats[0] ?? { total: 0, handed_over: 0, pending: 0, discrepancy: 0, in_running_session: 0 };
    const iStats = instantStats[0] ?? { total: 0, handed_over: 0, pending: 0 };

    const combinedStats = {
      total: Number(sStats.total || 0) + Number(iStats.total || 0),
      handed_over: Number(sStats.handed_over || 0) + Number(iStats.handed_over || 0),
      pending: Number(sStats.pending || 0) + Number(iStats.pending || 0),
      discrepancy: Number(sStats.discrepancy || 0),
      in_running_session: Number(sStats.in_running_session || 0) + Number(iStats.total || 0),
    };

    return NextResponse.json({
      success: true,
      data,
      stats: combinedStats,
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
    console.error('Error fetching sorting details:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch sorting details' },
      { status: 500 }
    );
  }
}