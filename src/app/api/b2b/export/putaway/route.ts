// app/api/b2b/export/putaway/route.ts

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
    if (!userSession) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    // 🔥 Ambil semua data putaway dengan JOIN ke manifest_order dan manifest_reference
    const putaways = await sql`
      SELECT 
        bp.id,
        bp.reference,
        bp.box_id,
        bp.box_number,
        bp.weight,
        bp.site,
        bp.staging_location,
        bp.store_name,
        bp.address,
        bp.city,
        bp.province,
        bp.loading_status,
        bp.driver,
        bp.operator,
        bp.security,
        bp.police_number,
        bp.putaway_at,
        bp.loading_at,
        bp.delivery_number,
        bp.created_at,
        bp.updated_at,
        mo.vendor_name,
        mo.loading_date,
        mo.total_box,
        mo.total_weight,
        mr.resi_number,
        mr.delivered_status,
        mr.arrive_date
      FROM b2b_putaway bp
      LEFT JOIN manifest_order mo ON mo.delivery_number = bp.delivery_number
      LEFT JOIN manifest_reference mr ON mr.manifest_id = mo.id AND mr.reference = bp.reference
      ORDER BY bp.delivery_number ASC, bp.reference ASC, bp.created_at ASC
    `;

    return NextResponse.json({
      success: true,
      data: putaways,
    });

  } catch (error) {
    console.error('Export putaway error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Gagal export data' },
      { status: 500 }
    );
  }
}