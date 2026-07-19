// app/api/b2b/putaway/list/[reference]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { reference: string } }
) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    const reference = decodeURIComponent(params.reference);

    // 🔥 JOIN dengan master_store untuk ambil brand
    const boxes = await sql`
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
        bp.driver_sign,
        bp.security_sign,
        bp.putaway_at,
        bp.loading_at,
        bp.delivery_number,
        ms."Brand" as brand
      FROM b2b_putaway bp
      LEFT JOIN master_store ms ON ms.site = bp.site
      WHERE bp.reference = ${reference}
      ORDER BY bp.created_at ASC
    `;

    const total = await sql`
      SELECT 
        COUNT(*) as total_box,
        SUM(weight::DECIMAL) as total_weight
      FROM b2b_putaway
      WHERE reference = ${reference}
    `;

    return NextResponse.json({
      success: true,
      data: {
        reference,
        boxes: boxes || [],
        total_box: Number(total[0]?.total_box || 0),
        total_weight: Number(total[0]?.total_weight || 0),
      },
    });

  } catch (error) {
    console.error('Error fetching putaway list:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch putaway list' },
      { status: 500 }
    );
  }
}