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
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    // 🔥 Ambil semua statistik dalam 1 query
    const stats = await sql`
      SELECT 
        -- Total Sessions
        (SELECT COUNT(*) FROM sorting_sessions) as total_sessions,
        
        -- Active Sessions (RUNNING)
        (SELECT COUNT(*) FROM sorting_sessions WHERE status = 'RUNNING') as active_sessions,
        
        -- Total Handovers
        (SELECT COUNT(*) FROM handover_manifests) as total_handovers,
        
        -- Total History Logs
        (SELECT COUNT(*) FROM history_logs) as total_history,
        
        -- Today's Sessions
        (SELECT COUNT(*) FROM sorting_sessions WHERE created_at::DATE = CURRENT_DATE) as today_sessions,
        
        -- Today's Handovers
        (SELECT COUNT(*) FROM handover_manifests WHERE signed_at::DATE = CURRENT_DATE) as today_handovers,
        
        -- Total Discrepancy
        (SELECT COALESCE(SUM(total_discrepancy), 0) FROM handover_manifests) as total_discrepancy,
        
        -- Total Paket (from sorting_details)
        (SELECT COUNT(*) FROM sorting_details) as total_packages,
        
        -- Paket yang sudah di-handover
        (SELECT COUNT(*) FROM sorting_details WHERE is_validated_handover = true) as validated_packages,
        
        -- Paket yang belum di-handover
        (SELECT COUNT(*) FROM sorting_details WHERE is_validated_handover = false) as pending_packages
    `;

    // 🔥 Ambil recent activity (5 terakhir)
    const recentActivity = await sql`
      SELECT 
        'handover' as type,
        hm.id,
        hm.signed_at as created_at,
        ss.session_code,
        mt.transporter_name,
        hm.courier_name,
        hm.total_packages_handed as total_items
      FROM handover_manifests hm
      JOIN sorting_sessions ss ON ss.id = hm.session_id
      JOIN master_transporters mt ON mt.id = ss.transporter_id
      ORDER BY hm.signed_at DESC
      LIMIT 5
    `;

    return NextResponse.json({
      success: true,
      stats: stats[0] || {
        total_sessions: 0,
        active_sessions: 0,
        total_handovers: 0,
        total_history: 0,
        today_sessions: 0,
        today_handovers: 0,
        total_discrepancy: 0,
        total_packages: 0,
        validated_packages: 0,
        pending_packages: 0,
      },
      recentActivity: recentActivity || [],
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}