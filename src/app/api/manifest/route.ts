import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';

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
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }

    // 🔥 QUERY LANGSUNG - PASTIKAN DATA TERBARU
    const manifests = await sql`
      SELECT 
        hm.id,
        hm.session_id,
        hm.courier_name,
        hm.security_name,
        hm.vehicle_number,
        hm.total_packages_handed,
        hm.total_discrepancy,
        hm.signed_at,
        ss.session_code,
        mt.transporter_name,
        u.full_name as operator_name
      FROM handover_manifests hm
      LEFT JOIN sorting_sessions ss ON ss.id = hm.session_id
      LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
      LEFT JOIN users u ON u.id = ss.operator_id
      ORDER BY hm.signed_at DESC
    `;

    // 🔥 LOG UNTUK DEBUG
    console.log(`📊 Manifest found: ${manifests.length}`);

    return NextResponse.json({
      success: true,
      data: manifests,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('Error fetching manifest list:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch manifest list' },
      { status: 500 }
    );
  }
}