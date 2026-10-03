import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper: cek apakah tabel ada
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${tableName}
      ) as exists
    `;
    return result[0]?.exists || false;
  } catch {
    return false;
  }
}

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

    // =============================================
    // 🔥 B2C STATS
    // =============================================
    const b2cResult = await sql`
      SELECT 
        (SELECT COUNT(*) FROM sorting_sessions) as total_sessions,
        (SELECT COUNT(*) FROM sorting_sessions WHERE status = 'RUNNING') as active_sessions,
        (SELECT COUNT(*) FROM handover_manifests) as total_handovers,
        (SELECT COUNT(*) FROM history_logs) as total_history,
        (SELECT COUNT(*) FROM sorting_sessions WHERE created_at::DATE = CURRENT_DATE) as today_sessions,
        (SELECT COUNT(*) FROM handover_manifests WHERE signed_at::DATE = CURRENT_DATE) as today_handovers,
        (SELECT COALESCE(SUM(total_discrepancy), 0) FROM handover_manifests) as total_discrepancy,
        (SELECT COUNT(*) FROM sorting_details) as total_packages,
        (SELECT COUNT(*) FROM sorting_details WHERE is_validated_handover = true) as validated_packages,
        (SELECT COUNT(*) FROM sorting_details WHERE is_validated_handover = false) as pending_packages
    `;

    // =============================================
    // 🔥 INSTANT STATS (Optional - cek tabel dulu)
    // =============================================
    let instantStats = {
      total_instant: 0,
      stored_packages: 0,
      picked_packages: 0,
      completed_packages: 0,
      today_putaway: 0,
      today_picked: 0,
      is_available: false,
    };

    const hasInstantTable = await tableExists('instant_packages');
    if (hasInstantTable) {
      try {
        const result = await sql`
          SELECT 
            (SELECT COUNT(*) FROM instant_packages) as total_instant,
            (SELECT COUNT(*) FROM instant_packages WHERE status = 'STORED') as stored_packages,
            (SELECT COUNT(*) FROM instant_packages WHERE status = 'PICKED') as picked_packages,
            (SELECT COUNT(*) FROM instant_packages WHERE status = 'COMPLETED') as completed_packages,
            (SELECT COUNT(*) FROM instant_packages WHERE putaway_at::DATE = CURRENT_DATE) as today_putaway,
            (SELECT COUNT(*) FROM instant_packages WHERE picked_at::DATE = CURRENT_DATE) as today_picked
        `;
        instantStats = { ...result[0], is_available: true };
      } catch (err) {
        console.warn('⚠️ Error fetching instant stats:', err);
      }
    }

    // =============================================
    // 🔥 B2B STATS (Hanya dari b2b_putaway)
    // =============================================
    let b2bStats = {
      total_b2b_box: 0,
      staging_box: 0,
      loaded_box: 0,
      today_b2b_putaway: 0,
      today_b2b_loading: 0,
      total_references: 0,
      total_vendors: 0,
      total_sites: 0,
      total_weight: 0,
      total_volume: 0,
      is_available: false,
    };

    const hasB2BTable = await tableExists('b2b_putaway');
    if (hasB2BTable) {
      try {
        const result = await sql`
          SELECT 
            (SELECT COUNT(*) FROM b2b_putaway WHERE deleted_at IS NULL) as total_b2b_box,
            (SELECT COUNT(*) FROM b2b_putaway WHERE loading_status = 'staging' AND deleted_at IS NULL) as staging_box,
            (SELECT COUNT(*) FROM b2b_putaway WHERE loading_status = 'loading_complete' AND deleted_at IS NULL) as loaded_box,
            (SELECT COUNT(*) FROM b2b_putaway WHERE putaway_at::DATE = CURRENT_DATE AND deleted_at IS NULL) as today_b2b_putaway,
            (SELECT COUNT(*) FROM b2b_putaway WHERE loading_at::DATE = CURRENT_DATE AND deleted_at IS NULL) as today_b2b_loading,
            (SELECT COUNT(DISTINCT reference) FROM b2b_putaway WHERE deleted_at IS NULL) as total_references,
            (SELECT COUNT(DISTINCT vendor_name) FROM b2b_putaway WHERE vendor_name IS NOT NULL AND deleted_at IS NULL) as total_vendors,
            (SELECT COUNT(DISTINCT site) FROM b2b_putaway WHERE deleted_at IS NULL) as total_sites,
            (SELECT COALESCE(SUM(weight::DECIMAL), 0) FROM b2b_putaway WHERE deleted_at IS NULL AND weight IS NOT NULL AND weight ~ '^[0-9.]+$') as total_weight,
            (SELECT COALESCE(SUM(volume), 0) FROM b2b_putaway WHERE deleted_at IS NULL) as total_volume
        `;
        b2bStats = { ...result[0], is_available: true };
      } catch (err) {
        console.warn('⚠️ Error fetching B2B stats:', err);
      }
    }

        // =============================================
    // 🔥 RECENT ACTIVITY (B2C + Instant + B2B)
    // =============================================
    let recentActivity: any[] = [];

    try {
      // B2C Handover
      const b2cActivity = await sql`
        SELECT 
          'handover' as type,
          hm.id::text as id,
          hm.signed_at as created_at,
          ss.session_code as code,
          mt.transporter_name as name,
          hm.courier_name as detail,
          hm.total_packages_handed as total_items
        FROM handover_manifests hm
        JOIN sorting_sessions ss ON ss.id = hm.session_id
        JOIN master_transporters mt ON mt.id = ss.transporter_id
        ORDER BY hm.signed_at DESC
        LIMIT 5
      `;

      recentActivity = [...b2cActivity];

      // 🔥 B2B Loading - GROUP BY delivery_number (1 DN = 1 activity)
      if (hasB2BTable) {
        const b2bActivity = await sql`
          SELECT 
            'b2b_loading' as type,
            MAX(id)::text as id,
            MAX(loading_at) as created_at,
            delivery_number as code,
            vendor_name as name,
            CONCAT(
              COUNT(*)::text, ' box · ', 
              COUNT(DISTINCT reference)::text, ' reference'
            ) as detail,
            COUNT(*) as total_items
          FROM b2b_putaway
          WHERE delivery_number IS NOT NULL
            AND loading_at IS NOT NULL
            AND deleted_at IS NULL
          GROUP BY delivery_number, vendor_name
          ORDER BY MAX(loading_at) DESC
          LIMIT 5
        `;
        recentActivity = [...recentActivity, ...b2bActivity];
      }

      // 🔥 Instant Pickup (opsional)
      if (hasInstantTable) {
        const instantActivity = await sql`
          SELECT 
            'instant_pickup' as type,
            id::text as id,
            picked_at as created_at,
            barcode_resi as code,
            mt.transporter_name as name,
            location_code as detail,
            1 as total_items
          FROM instant_packages ip
          JOIN master_transporters mt ON mt.id = ip.transporter_id
          WHERE ip.picked_at IS NOT NULL
          ORDER BY ip.picked_at DESC
          LIMIT 5
        `;
        recentActivity = [...recentActivity, ...instantActivity];
      }

      // Sort semua activity by created_at DESC
      recentActivity.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      recentActivity = recentActivity.slice(0, 10);

    } catch (err) {
      console.warn('⚠️ Error fetching recent activity:', err);
    }

    return NextResponse.json({
      success: true,
      stats: {
        b2c: b2cResult[0] || {
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
        instant: instantStats,
        b2b: b2bStats,
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