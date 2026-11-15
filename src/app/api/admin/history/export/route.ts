import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { parseDateParam, parseEnumParam, toLikePattern } from '@/lib/api-params';
import { createCsvResponse } from '@/lib/csv';
import { toDateString } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BATCH_SIZE = 2000;
const STATUSES = ['DONE', 'CANCELLED', 'NOT_FOUND'] as const;

interface Cursor {
  at: string; // handover_at dalam teks penuh (presisi mikrodetik)
  id: string;
}

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

    // Filter sama persis dengan /api/admin/history; nilai null = filter tidak dipakai.
    const pattern = toLikePattern(searchParams.get('search'));
    const isInstantParam = searchParams.get('is_instant');
    const isInstant = isInstantParam === 'true' ? true : isInstantParam === 'false' ? false : null;
    const status = parseEnumParam(searchParams.get('status'), STATUSES);
    const dateFrom = parseDateParam(searchParams.get('date_from'));
    const dateTo = parseDateParam(searchParams.get('date_to'));

    const fetchBatch = async (cursor: Cursor | null) => {
      const cursorAt = cursor?.at ?? null;
      const cursorId = cursor?.id ?? null;

      const rows = await sql`
        SELECT
          h.session_code,
          h.transporter_name,
          h.resi_number,
          h.status,
          h.is_instant,
          h.location_code,
          h.handover_by,
          to_char(h.handover_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS handover_at_wib,
          h.handover_at::text AS cursor_at,
          h.id::text AS cursor_id
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
          AND (${cursorAt}::timestamptz IS NULL
                OR (h.handover_at, h.id) < (${cursorAt}::timestamptz, ${cursorId}))
        ORDER BY h.handover_at DESC, h.id DESC
        LIMIT ${BATCH_SIZE}
      `;

      const last = rows[rows.length - 1];
      return {
        rows: rows.map((r: Record<string, any>) => [
          r.session_code,
          r.transporter_name,
          r.resi_number,
          r.status,
          r.is_instant ? 'INSTANT' : 'REGULAR',
          r.location_code || '-',
          r.handover_by || '-',
          r.handover_at_wib,
        ]),
        next:
          rows.length === BATCH_SIZE ? ({ at: last.cursor_at, id: last.cursor_id } as Cursor) : null,
      };
    };

    return await createCsvResponse<Cursor>({
      filename: `history-logs-${toDateString()}.csv`,
      headers: [
        'Session Code',
        'Transporter',
        'Resi Number',
        'Status',
        'Type',
        'Location',
        'Handover By',
        'Handover At (WIB)',
      ],
      fetchBatch,
    });
  } catch (error) {
    console.error('Error exporting history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export history' },
      { status: 500 }
    );
  }
}