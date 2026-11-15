import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { parseDateParam, parseEnumParam, toLikePattern } from '@/lib/api-params';
import { createCsvResponse } from '@/lib/csv';
import { toDateString } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BATCH_SIZE = 2000;
const SESSION_STATUSES = ['running', 'closed'] as const;
const SOURCES = ['sorting', 'instant'] as const;
const HANDOVERS = ['done', 'pending', 'discrepancy'] as const;

interface Cursor {
  at: string; // scanned_at dalam teks penuh (presisi mikrodetik)
  src: string;
  id: string;
}

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userSession = await verifySession(sessionToken);
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // Filter sama dengan /api/admin/sorting-details; nilai null = filter tidak dipakai.
    const pattern = toLikePattern(searchParams.get('search'));
    const sessionStatusParam = parseEnumParam(searchParams.get('session_status'), SESSION_STATUSES);
    const sessionStatus = sessionStatusParam ? sessionStatusParam.toUpperCase() : null;
    const source = parseEnumParam(searchParams.get('source'), SOURCES);
    const handover = parseEnumParam(searchParams.get('handover'), HANDOVERS);
    const dateFrom = parseDateParam(searchParams.get('date_from'));
    const dateTo = parseDateParam(searchParams.get('date_to'));

    const fetchBatch = async (cursor: Cursor | null) => {
      const cursorAt = cursor?.at ?? null;
      const cursorSrc = cursor?.src ?? null;
      const cursorId = cursor?.id ?? null;

      const rows = await sql`
        SELECT
          combined.session_code,
          combined.barcode_resi,
          combined.transporter_name,
          to_char(combined.scanned_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS scanned_at_wib,
          combined.handover_status,
          combined.discrepancy_reason,
          to_char(combined.validated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS validated_at_wib,
          combined.sorting_by_name,
          combined.scanned_at::text AS cursor_at,
          combined.source_type AS cursor_src,
          combined.id AS cursor_id
        FROM (
          -- 1) Sorting Details
          SELECT
            sd.id::text                   AS id,
            ss.session_code::text         AS session_code,
            sd.barcode_resi::text         AS barcode_resi,
            COALESCE(mt.transporter_name, '-')::text AS transporter_name,
            sd.scanned_at                 AS scanned_at,
            CASE WHEN sd.is_validated_handover = true THEN 'Sudah' ELSE 'Belum' END::text AS handover_status,
            sd.discrepancy_reason::text   AS discrepancy_reason,
            sd.validated_at               AS validated_at,
            u.full_name::text             AS sorting_by_name,
            'sorting'::text               AS source_type,
            ss.status::text               AS session_status
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          LEFT JOIN users u ON u.id = sd.sorting_by

          UNION ALL

          -- 2) Instant Packages
          SELECT
            ip.id::text                   AS id,
            TO_CHAR(ip.putaway_at AT TIME ZONE 'Asia/Jakarta', '"INST-"YYYY-MM-DD')::text AS session_code,
            ip.barcode_resi::text         AS barcode_resi,
            COALESCE(mt.transporter_name, '-')::text AS transporter_name,
            ip.putaway_at                 AS scanned_at,
            CASE WHEN ip.status = 'PICKED' THEN 'Sudah' ELSE 'Belum' END::text AS handover_status,
            NULL::text                    AS discrepancy_reason,
            ip.picked_at                  AS validated_at,
            u.full_name::text             AS sorting_by_name,
            'instant'::text               AS source_type,
            'RUNNING'::text               AS session_status
          FROM instant_packages ip
          LEFT JOIN master_transporters mt ON mt.id = ip.transporter_id
          LEFT JOIN users u ON u.id = ip.putaway_by
          WHERE ip.status IN ('STORED', 'PICKED')
        ) combined
        WHERE (${pattern}::text IS NULL
                OR combined.barcode_resi ILIKE ${pattern}::text
                OR combined.session_code ILIKE ${pattern}::text
                OR combined.transporter_name ILIKE ${pattern}::text)
          AND (${sessionStatus}::text IS NULL OR combined.session_status = ${sessionStatus}::text)
          AND (${source}::text IS NULL OR combined.source_type = ${source}::text)
          AND (${handover}::text IS NULL
                OR (${handover}::text = 'done' AND combined.handover_status = 'Sudah')
                OR (${handover}::text = 'pending' AND combined.handover_status = 'Belum')
                OR (${handover}::text = 'discrepancy' AND combined.discrepancy_reason IS NOT NULL))
          AND (${dateFrom}::date IS NULL
                OR combined.scanned_at >= (${dateFrom}::date::timestamp AT TIME ZONE 'Asia/Jakarta'))
          AND (${dateTo}::date IS NULL
                OR combined.scanned_at < ((${dateTo}::date + 1)::timestamp AT TIME ZONE 'Asia/Jakarta'))
          AND (${cursorAt}::timestamptz IS NULL
                OR (combined.scanned_at, combined.source_type, combined.id)
                   < (${cursorAt}::timestamptz, ${cursorSrc}::text, ${cursorId}::text))
        ORDER BY combined.scanned_at DESC, combined.source_type DESC, combined.id DESC
        LIMIT ${BATCH_SIZE}
      `;

      const last = rows[rows.length - 1];
      return {
        rows: rows.map((r: Record<string, any>) => [
          r.session_code || '',
          r.barcode_resi || '',
          r.transporter_name || '',
          r.scanned_at_wib || '',
          r.handover_status || 'Belum',
          r.discrepancy_reason || '-',
          r.validated_at_wib || '-',
          r.sorting_by_name || '-',
        ]),
        next:
          rows.length === BATCH_SIZE
            ? ({ at: last.cursor_at, src: last.cursor_src, id: last.cursor_id } as Cursor)
            : null,
      };
    };

    return await createCsvResponse<Cursor>({
      filename: `sorting-details-${toDateString()}.csv`,
      headers: [
        'Session Code',
        'Resi Number',
        'Transporter',
        'Scanned At',
        'Handover Status',
        'Discrepancy Reason',
        'Validated At',
        'Sorting By',
      ],
      fetchBatch,
    });
  } catch (error) {
    console.error('Error exporting sorting details:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}