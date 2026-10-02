import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
    const search = searchParams.get('search') || '';
    const sessionStatus = searchParams.get('session_status') || 'all';

    // 🔥 Gabungan dari sorting_details + instant_packages via UNION ALL
    // Kolom disamakan jumlah & tipe-nya:
    //   - session_code      (text)
    //   - barcode_resi      (text)
    //   - transporter_name  (text)
    //   - scanned_at        (timestamptz)
    //   - handover_status   (text: "Sudah" | "Belum")
    //   - discrepancy_reason(text | null)
    //   - validated_at      (timestamptz | null)
    //   - sorting_by_name   (text | null)
    //   - source_type       (text: "sorting" | "instant") — untuk filter opsional
    let query = `
      SELECT * FROM (
        -- 1) Sorting Details
        SELECT 
          ss.session_code::text         AS session_code,
          sd.barcode_resi::text         AS barcode_resi,
          COALESCE(mt.transporter_name, '-')::text AS transporter_name,
          sd.scanned_at                 AS scanned_at,
          CASE 
            WHEN sd.is_validated_handover = true THEN 'Sudah'
            ELSE 'Belum'
          END::text                     AS handover_status,
          sd.discrepancy_reason::text   AS discrepancy_reason,
          sd.validated_at               AS validated_at,
          u.full_name::text             AS sorting_by_name,
          'sorting'::text               AS source_type,
          ss.status::text               AS session_status
        FROM sorting_details sd
        JOIN sorting_sessions ss ON ss.id = sd.session_id
        LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
        LEFT JOIN users u ON u.id = sd.sorting_by
        WHERE 1=1

        UNION ALL

        -- 2) Instant Packages
        SELECT
          ('INST-' || TO_CHAR(ip.putaway_at, 'YYYY-MM-DD'))::text AS session_code,
          ip.barcode_resi::text         AS barcode_resi,
          COALESCE(mt.transporter_name, '-')::text AS transporter_name,
          ip.putaway_at                 AS scanned_at,
          CASE
            WHEN ip.status = 'PICKED' THEN 'Sudah'
            ELSE 'Belum'
          END::text                     AS handover_status,
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
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Filter search (berlaku untuk kedua sumber)
    if (search) {
      const searchPattern = `%${search}%`;
      query += ` AND (barcode_resi ILIKE $${paramIndex} OR session_code ILIKE $${paramIndex} OR transporter_name ILIKE $${paramIndex})`;
      params.push(searchPattern);
      paramIndex++;
    }

    // Filter status session — hanya berlaku untuk sorting_details.
    // Instant selalu dianggap RUNNING, jadi kalau filter = 'closed', instant dikecualikan.
    if (sessionStatus === 'running') {
      query += ` AND session_status = $${paramIndex}`;
      params.push('RUNNING');
      paramIndex++;
    } else if (sessionStatus === 'closed') {
      query += ` AND session_status = $${paramIndex} AND source_type = $${paramIndex + 1}`;
      params.push('CLOSED', 'sorting');
      paramIndex += 2;
    }

    query += ` ORDER BY scanned_at DESC`;

    // Eksekusi query
    const rows = await sql(query, params);

    // Format CSV
    const headers = [
      'Session Code',
      'Resi Number',
      'Transporter',
      'Scanned At',
      'Handover Status',
      'Discrepancy Reason',
      'Validated At',
      'Sorting By'
    ];

    const escapeCsvField = (value: unknown) => {
      const str = String(value ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvRows = rows.map((r: any) => [
      r.session_code || '',
      r.barcode_resi || '',
      r.transporter_name || '',
      new Date(r.scanned_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      r.handover_status || 'Belum',
      r.discrepancy_reason || '-',
      r.validated_at ? new Date(r.validated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-',
      r.sorting_by_name || '-'
    ]);

    const csvContent = [
      headers.map(escapeCsvField).join(','),
      ...csvRows.map((row: string[]) => row.map(escapeCsvField).join(','))
    ].join('\n');

    return new NextResponse('\ufeff' + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=sorting-details-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  } catch (error) {
    console.error('Error exporting sorting details:', error);
    return NextResponse.json(
      { error: 'Failed to export' },
      { status: 500 }
    );
  }
}