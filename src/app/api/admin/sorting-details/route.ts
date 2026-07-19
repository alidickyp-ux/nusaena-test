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

    // ============================================================
    // 1. QUERY UNTUK SORTING_DETAILS (B2C Regular)
    // ============================================================
    let sortingRows: any[] = [];
    let sortingTotal = 0;

    if (search) {
      const p = `%${search}%`;
      if (sessionStatus === 'running') {
        sortingRows = await sql`
          SELECT 
            sd.id, 
            sd.barcode_resi, 
            sd.scanned_at, 
            sd.is_validated_handover,
            sd.discrepancy_reason, 
            sd.validated_at,
            ss.session_code, 
            ss.status as session_status,
            COALESCE(mt.transporter_name, '-') as transporter_name,
            'sorting' as source_type,
            NULL as instant_status
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          WHERE ss.status = 'RUNNING'
            AND (sd.barcode_resi ILIKE ${p} OR ss.session_code ILIKE ${p} OR mt.transporter_name ILIKE ${p})
          ORDER BY sd.scanned_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const totalResult = await sql`
          SELECT COUNT(*) as total
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          WHERE ss.status = 'RUNNING'
            AND (sd.barcode_resi ILIKE ${p} OR ss.session_code ILIKE ${p} OR mt.transporter_name ILIKE ${p})
        `;
        sortingTotal = parseInt(totalResult[0]?.total || '0');
      } else if (sessionStatus === 'closed') {
        sortingRows = await sql`
          SELECT 
            sd.id, 
            sd.barcode_resi, 
            sd.scanned_at, 
            sd.is_validated_handover,
            sd.discrepancy_reason, 
            sd.validated_at,
            ss.session_code, 
            ss.status as session_status,
            COALESCE(mt.transporter_name, '-') as transporter_name,
            'sorting' as source_type,
            NULL as instant_status
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          WHERE ss.status = 'CLOSED'
            AND (sd.barcode_resi ILIKE ${p} OR ss.session_code ILIKE ${p} OR mt.transporter_name ILIKE ${p})
          ORDER BY sd.scanned_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const totalResult = await sql`
          SELECT COUNT(*) as total
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          WHERE ss.status = 'CLOSED'
            AND (sd.barcode_resi ILIKE ${p} OR ss.session_code ILIKE ${p} OR mt.transporter_name ILIKE ${p})
        `;
        sortingTotal = parseInt(totalResult[0]?.total || '0');
      } else {
        sortingRows = await sql`
          SELECT 
            sd.id, 
            sd.barcode_resi, 
            sd.scanned_at, 
            sd.is_validated_handover,
            sd.discrepancy_reason, 
            sd.validated_at,
            ss.session_code, 
            ss.status as session_status,
            COALESCE(mt.transporter_name, '-') as transporter_name,
            'sorting' as source_type,
            NULL as instant_status
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          WHERE sd.barcode_resi ILIKE ${p} OR ss.session_code ILIKE ${p} OR mt.transporter_name ILIKE ${p}
          ORDER BY sd.scanned_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const totalResult = await sql`
          SELECT COUNT(*) as total
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          WHERE sd.barcode_resi ILIKE ${p} OR ss.session_code ILIKE ${p} OR mt.transporter_name ILIKE ${p}
        `;
        sortingTotal = parseInt(totalResult[0]?.total || '0');
      }
    } else {
      if (sessionStatus === 'running') {
        sortingRows = await sql`
          SELECT 
            sd.id, 
            sd.barcode_resi, 
            sd.scanned_at, 
            sd.is_validated_handover,
            sd.discrepancy_reason, 
            sd.validated_at,
            ss.session_code, 
            ss.status as session_status,
            COALESCE(mt.transporter_name, '-') as transporter_name,
            'sorting' as source_type,
            NULL as instant_status
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          WHERE ss.status = 'RUNNING'
          ORDER BY sd.scanned_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const totalResult = await sql`
          SELECT COUNT(*) as total
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          WHERE ss.status = 'RUNNING'
        `;
        sortingTotal = parseInt(totalResult[0]?.total || '0');
      } else if (sessionStatus === 'closed') {
        sortingRows = await sql`
          SELECT 
            sd.id, 
            sd.barcode_resi, 
            sd.scanned_at, 
            sd.is_validated_handover,
            sd.discrepancy_reason, 
            sd.validated_at,
            ss.session_code, 
            ss.status as session_status,
            COALESCE(mt.transporter_name, '-') as transporter_name,
            'sorting' as source_type,
            NULL as instant_status
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          WHERE ss.status = 'CLOSED'
          ORDER BY sd.scanned_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const totalResult = await sql`
          SELECT COUNT(*) as total
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          WHERE ss.status = 'CLOSED'
        `;
        sortingTotal = parseInt(totalResult[0]?.total || '0');
      } else {
        sortingRows = await sql`
          SELECT 
            sd.id, 
            sd.barcode_resi, 
            sd.scanned_at, 
            sd.is_validated_handover,
            sd.discrepancy_reason, 
            sd.validated_at,
            ss.session_code, 
            ss.status as session_status,
            COALESCE(mt.transporter_name, '-') as transporter_name,
            'sorting' as source_type,
            NULL as instant_status
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
          LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
          ORDER BY sd.scanned_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const totalResult = await sql`
          SELECT COUNT(*) as total
          FROM sorting_details sd
          JOIN sorting_sessions ss ON ss.id = sd.session_id
        `;
        sortingTotal = parseInt(totalResult[0]?.total || '0');
      }
    }

    // ============================================================
    // 2. QUERY UNTUK INSTANT_PACKAGES (B2C Instant)
    //    - Format session_code: INST-{tanggal}
    // ============================================================
    let instantRows: any[] = [];
    let instantTotal = 0;

    // Hanya query instant jika tidak filter session_status = 'closed'
    if (sessionStatus !== 'closed') {
      if (search) {
        const p = `%${search}%`;
        instantRows = await sql`
          SELECT 
            ip.id, 
            ip.barcode_resi, 
            ip.putaway_at as scanned_at,
            CASE 
              WHEN ip.status = 'PICKED' THEN true 
              ELSE false 
            END as is_validated_handover,
            NULL as discrepancy_reason,
            ip.picked_at as validated_at,
            TO_CHAR(ip.putaway_at, '"INST-"YYYY-MM-DD') as session_code,
            'RUNNING' as session_status,
            'INSTANT' as transporter_name,
            'instant' as source_type,
            ip.status as instant_status
          FROM instant_packages ip
          WHERE ip.status IN ('STORED', 'PICKED')
            AND ip.barcode_resi ILIKE ${p}
          ORDER BY ip.putaway_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const totalResult = await sql`
          SELECT COUNT(*) as total
          FROM instant_packages ip
          WHERE ip.status IN ('STORED', 'PICKED')
            AND ip.barcode_resi ILIKE ${p}
        `;
        instantTotal = parseInt(totalResult[0]?.total || '0');
      } else {
        instantRows = await sql`
          SELECT 
            ip.id, 
            ip.barcode_resi, 
            ip.putaway_at as scanned_at,
            CASE 
              WHEN ip.status = 'PICKED' THEN true 
              ELSE false 
            END as is_validated_handover,
            NULL as discrepancy_reason,
            ip.picked_at as validated_at,
            TO_CHAR(ip.putaway_at, '"INST-"YYYY-MM-DD') as session_code,
            'RUNNING' as session_status,
            'INSTANT' as transporter_name,
            'instant' as source_type,
            ip.status as instant_status
          FROM instant_packages ip
          WHERE ip.status IN ('STORED', 'PICKED')
          ORDER BY ip.putaway_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const totalResult = await sql`
          SELECT COUNT(*) as total
          FROM instant_packages ip
          WHERE ip.status IN ('STORED', 'PICKED')
        `;
        instantTotal = parseInt(totalResult[0]?.total || '0');
      }
    }

    // ============================================================
    // 3. GABUNGKAN DATA & URUTKAN
    // ============================================================
    const allRows = [...sortingRows, ...instantRows];
    
    // Urutkan berdasarkan scanned_at (terbaru di atas)
    allRows.sort((a, b) => {
      const dateA = new Date(a.scanned_at).getTime();
      const dateB = new Date(b.scanned_at).getTime();
      return dateB - dateA;
    });

    // Potong sesuai limit untuk pagination
    const paginatedRows = allRows.slice(offset, offset + limit);
    const total = sortingTotal + instantTotal;
    const totalPages = Math.ceil(total / limit);

    // ============================================================
    // 4. HITUNG STATISTIK
    // ============================================================
    // Sorting stats
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

    // Instant stats
    const instantStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PICKED' THEN 1 END) as handed_over,
        COUNT(CASE WHEN status = 'STORED' THEN 1 END) as pending,
        0 as discrepancy,
        COUNT(*) as in_running_session
      FROM instant_packages
      WHERE status IN ('STORED', 'PICKED')
    `;

    const sStats = sortingStats[0] || { total: 0, handed_over: 0, pending: 0, discrepancy: 0, in_running_session: 0 };
    const iStats = instantStats[0] || { total: 0, handed_over: 0, pending: 0, discrepancy: 0, in_running_session: 0 };

    const combinedStats = {
      total: (sStats.total || 0) + (iStats.total || 0),
      handed_over: (sStats.handed_over || 0) + (iStats.handed_over || 0),
      pending: (sStats.pending || 0) + (iStats.pending || 0),
      discrepancy: sStats.discrepancy || 0,
      in_running_session: (sStats.in_running_session || 0) + (iStats.in_running_session || 0),
    };

    return NextResponse.json({
      success: true,
      data: paginatedRows || [],
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