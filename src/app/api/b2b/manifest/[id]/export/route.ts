import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const manifestId = params.id;

    // 🔥 Ambil data putaway dengan JOIN ke manifest_references
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
        mo.delivery_number as manifest_delivery_number,
        mr.resi_number,
        mr.cost,
        mr.ppn
      FROM b2b_putaway bp
      INNER JOIN manifest_order mo ON mo.delivery_number = bp.delivery_number
      LEFT JOIN manifest_references mr ON mr.manifest_id = mo.id AND mr.reference = bp.reference
      WHERE mo.id = ${manifestId}::UUID
      ORDER BY bp.reference ASC, bp.created_at ASC
    `;

    if (putaways.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No data found for this manifest' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: putaways,
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Gagal mengambil data' 
      },
      { status: 500 }
    );
  }
}