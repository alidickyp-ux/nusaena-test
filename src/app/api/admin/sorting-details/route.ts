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
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const sessionStatus = searchParams.get('session_status'); // 'running' | 'closed' | null

    let rows: any[] = [];
    let total = 0;

    if (search) {
      const p = `%${search}%`;

      if (sessionStatus === 'closed') {
        rows = await sql`
          SELECT * FROM (
            SELECT 
              sd.id::text as id, sd.barcode_resi, sd.scanned_at, sd.is_validated_handover,
              sd.discrepancy_reason, sd.validated_at,
              ss.session_code, ss.status as session_status,
              COALESCE(mt.transporter_name, '-') as transporter_name,
              u.full_name as sorting_by_name,
              'sorting' as source_type, NULL::text as instant_status
            FROM sorting_details sd
            JOIN sorting_sessions ss ON ss.id = sd.session_id
            LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
            LEFT JOIN users u ON u.id = sd.sorting_by
            WHERE ss.status = 'CLOSED'
              AND (sd.barcode_resi ILIKE ${p} OR ss.session_code ILIKE ${p} OR mt.transporter_name ILIKE ${p})
          ) combined
          ORDER BY scanned_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const t = await sql`
          SELECT COUNT(*) as total
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          LEFT JOIN users u ON u.id = sd.sorting_by
          WHERE ss.status = 'CLOSED'
            AND (sd.barcode_resi ILIKE ${p} OR ss.session_code ILIKE ${p} OR mt.transporter_name ILIKE ${p})
        `;
        total = parseInt(t[0]?.total || '0');
      } else if (sessionStatus === 'running') {
        rows = await sql`
          SELECT * FROM (
            SELECT 
              sd.id::text as id, sd.barcode_resi, sd.scanned_at, sd.is_validated_handover,
              sd.discrepancy_reason, sd.validated_at,
              ss.session_code, ss.status as session_status,
              COALESCE(mt.transporter_name, '-') as transporter_name,
              u.full_name as sorting_by_name,
              'sorting' as source_type, NULL::text as instant_status
            FROM sorting_details sd
            JOIN sorting_sessions ss ON ss.id = sd.session_id
            LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
            LEFT JOIN users u ON u.id = sd.sorting_by
            WHERE ss.status = 'RUNNING'
              AND (sd.barcode_resi ILIKE ${p} OR ss.session_code ILIKE ${p} OR mt.transporter_name ILIKE ${p})

            UNION ALL

            SELECT
              ip.id::text as id, ip.barcode_resi, ip.putaway_at as scanned_at,
              (ip.status = 'PICKED') as is_validated_handover,
              NULL::text as discrepancy_reason, ip.picked_at as validated_at,
              TO_CHAR(ip.putaway_at, '"INST-"YYYY-MM-DD') as session_code,
              'RUNNING' as session_status, 'INSTANT' as transporter_name,
              NULL::text as sorting_by_name,
              'instant' as source_type, ip.status as instant_status
            FROM instant_packages ip
            WHERE ip.status IN ('STORED', 'PICKED')
              AND ip.barcode_resi ILIKE ${p}
          ) combined
          ORDER BY scanned_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const t = await sql`
          SELECT
            (SELECT COUNT(*) FROM sorting_details sd
              JOIN sorting_sessions ss ON ss.id = sd.session_id
              LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
              LEFT JOIN users u ON u.id = sd.sorting_by
              WHERE ss.status = 'RUNNING'
                AND (sd.barcode_resi ILIKE ${p} OR ss.session_code ILIKE ${p} OR mt.transporter_name ILIKE ${p}))
            +
            (SELECT COUNT(*) FROM instant_packages ip
              WHERE ip.status IN ('STORED', 'PICKED') AND ip.barcode_resi ILIKE ${p})
          as total
        `;
        total = parseInt(t[0]?.total || '0');
      } else {
        rows = await sql`
          SELECT * FROM (
            SELECT 
              sd.id::text as id, sd.barcode_resi, sd.scanned_at, sd.is_validated_handover,
              sd.discrepancy_reason, sd.validated_at,
              ss.session_code, ss.status as session_status,
              COALESCE(mt.transporter_name, '-') as transporter_name,
              u.full_name as sorting_by_name,
              'sorting' as source_type, NULL::text as instant_status
            FROM sorting_details sd
            JOIN sorting_sessions ss ON ss.id = sd.session_id
            LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
            LEFT JOIN users u ON u.id = sd.sorting_by
            WHERE sd.barcode_resi ILIKE ${p} OR ss.session_code ILIKE ${p} OR mt.transporter_name ILIKE ${p}

            UNION ALL

            SELECT
              ip.id::text as id, ip.barcode_resi, ip.putaway_at as scanned_at,
              (ip.status = 'PICKED') as is_validated_handover,
              NULL::text as discrepancy_reason, ip.picked_at as validated_at,
              TO_CHAR(ip.putaway_at, '"INST-"YYYY-MM-DD') as session_code,
              'RUNNING' as session_status, 'INSTANT' as transporter_name,
              NULL::text as sorting_by_name,
              'instant' as source_type, ip.status as instant_status
            FROM instant_packages ip
            WHERE ip.status IN ('STORED', 'PICKED')
              AND ip.barcode_resi ILIKE ${p}
          ) combined
          ORDER BY scanned_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const t = await sql`
          SELECT
            (SELECT COUNT(*) FROM sorting_details sd
              JOIN sorting_sessions ss ON ss.id = sd.session_id
              LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
              LEFT JOIN users u ON u.id = sd.sorting_by
              WHERE sd.barcode_resi ILIKE ${p} OR ss.session_code ILIKE ${p} OR mt.transporter_name ILIKE ${p})
            +
            (SELECT COUNT(*) FROM instant_packages ip
              WHERE ip.status IN ('STORED', 'PICKED') AND ip.barcode_resi ILIKE ${p})
          as total
        `;
        total = parseInt(t[0]?.total || '0');
      }
    } else {
      if (sessionStatus === 'closed') {
        rows = await sql`
          SELECT * FROM (
            SELECT 
              sd.id::text as id, sd.barcode_resi, sd.scanned_at, sd.is_validated_handover,
              sd.discrepancy_reason, sd.validated_at,
              ss.session_code, ss.status as session_status,
              COALESCE(mt.transporter_name, '-') as transporter_name,
              u.full_name as sorting_by_name,
              'sorting' as source_type, NULL::text as instant_status
            FROM sorting_details sd
            JOIN sorting_sessions ss ON ss.id = sd.session_id
            LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
            LEFT JOIN users u ON u.id = sd.sorting_by
            WHERE ss.status = 'CLOSED'
          ) combined
          ORDER BY scanned_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const t = await sql`
          SELECT COUNT(*) as total
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          LEFT JOIN users u ON u.id = sd.sorting_by
          WHERE ss.status = 'CLOSED'
        `;
        total = parseInt(t[0]?.total || '0');
      } else if (sessionStatus === 'running') {
        rows = await sql`
          SELECT * FROM (
            SELECT 
              sd.id::text as id, sd.barcode_resi, sd.scanned_at, sd.is_validated_handover,
              sd.discrepancy_reason, sd.validated_at,
              ss.session_code, ss.status as session_status,
              COALESCE(mt.transporter_name, '-') as transporter_name,
              u.full_name as sorting_by_name,
              'sorting' as source_type, NULL::text as instant_status
            FROM sorting_details sd
            JOIN sorting_sessions ss ON ss.id = sd.session_id
            LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
            LEFT JOIN users u ON u.id = sd.sorting_by
            WHERE ss.status = 'RUNNING'

            UNION ALL

            SELECT
              ip.id::text as id, ip.barcode_resi, ip.putaway_at as scanned_at,
              (ip.status = 'PICKED') as is_validated_handover,
              NULL::text as discrepancy_reason, ip.picked_at as validated_at,
              TO_CHAR(ip.putaway_at, '"INST-"YYYY-MM-DD') as session_code,
              'RUNNING' as session_status, 'INSTANT' as transporter_name,
              NULL::text as sorting_by_name,
              'instant' as source_type, ip.status as instant_status
            FROM instant_packages ip
            WHERE ip.status IN ('STORED', 'PICKED')
          ) combined
          ORDER BY scanned_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const t = await sql`
          SELECT
            (SELECT COUNT(*) FROM sorting_details sd
              JOIN sorting_sessions ss ON ss.id = sd.session_id
              LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
              LEFT JOIN users u ON u.id = sd.sorting_by
              WHERE ss.status = 'RUNNING')
            +
            (SELECT COUNT(*) FROM instant_packages ip WHERE ip.status IN ('STORED', 'PICKED'))
          as total
        `;
        total = parseInt(t[0]?.total || '0');
      } else {
        rows = await sql`
          SELECT * FROM (
            SELECT 
              sd.id::text as id, sd.barcode_resi, sd.scanned_at, sd.is_validated_handover,
              sd.discrepancy_reason, sd.validated_at,
              ss.session_code, ss.status as session_status,
              COALESCE(mt.transporter_name, '-') as transporter_name,
              u.full_name as sorting_by_name,
              'sorting' as source_type, NULL::text as instant_status
            FROM sorting_details sd
            JOIN sorting_sessions ss ON ss.id = sd.session_id
            LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
            LEFT JOIN users u ON u.id = sd.sorting_by

            UNION ALL

            SELECT
              ip.id::text as id, ip.barcode_resi, ip.putaway_at as scanned_at,
              (ip.status = 'PICKED') as is_validated_handover,
              NULL::text as discrepancy_reason, ip.picked_at as validated_at,
              TO_CHAR(ip.putaway_at, '"INST-"YYYY-MM-DD') as session_code,
              'RUNNING' as session_status, 'INSTANT' as transporter_name,
              NULL::text as sorting_by_name,
              'instant' as source_type, ip.status as instant_status
            FROM instant_packages ip
            WHERE ip.status IN ('STORED', 'PICKED')
          ) combined
          ORDER BY scanned_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const t = await sql`
          SELECT
            (SELECT COUNT(*) FROM sorting_details sd
              JOIN sorting_sessions ss ON ss.id = sd.session_id
              LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
              LEFT JOIN users u ON u.id = sd.sorting_by)
            +
            (SELECT COUNT(*) FROM instant_packages ip WHERE ip.status IN ('STORED', 'PICKED'))
          as total
        `;
        total = parseInt(t[0]?.total || '0');
      }
    }

    const totalPages = Math.ceil(total / limit);

    // Stats tetap GLOBAL (tidak ikut filter)
    const sortingStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN sd.is_validated_handover = true THEN 1 END) as handed_over,
        COUNT(CASE WHEN sd.is_validated_handover = false THEN 1 END) as pending,
        COUNT(CASE WHEN sd.discrepancy_reason IS NOT NULL THEN 1 END) as discrepancy,
        COUNT(CASE WHEN ss.status = 'RUNNING' THEN 1 END) as in_running_session
      FROM sorting_details sd
      JOIN sorting_sessions ss ON ss.id = sd.session_id
    `;

    const instantStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PICKED' THEN 1 END) as handed_over,
        COUNT(CASE WHEN status = 'STORED' THEN 1 END) as pending
      FROM instant_packages
      WHERE status IN ('STORED', 'PICKED')
    `;

    const sStats = sortingStats[0] || { total: 0, handed_over: 0, pending: 0, discrepancy: 0, in_running_session: 0 };
    const iStats = instantStats[0] || { total: 0, handed_over: 0, pending: 0 };

    const combinedStats = {
      total: Number(sStats.total || 0) + Number(iStats.total || 0),
      handed_over: Number(sStats.handed_over || 0) + Number(iStats.handed_over || 0),
      pending: Number(sStats.pending || 0) + Number(iStats.pending || 0),
      discrepancy: Number(sStats.discrepancy || 0),
      in_running_session: Number(sStats.in_running_session || 0) + Number(iStats.total || 0),
    };

    return NextResponse.json({
      success: true,
      data: rows || [],
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
      { success: false, message: 'Failed to fetch sorting details', error: String(error) },
      { status: 500 }
    );
  }
}