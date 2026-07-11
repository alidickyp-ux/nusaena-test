import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (userSession.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin only' },
        { status: 403 }
      );
    }

    const manifestId = params.id;

    if (!manifestId) {
      return NextResponse.json(
        { success: false, message: 'Manifest ID is required' },
        { status: 400 }
      );
    }

    // 🔥 Ambil detail manifest
    const manifest = await sql`
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
      JOIN sorting_sessions ss ON ss.id = hm.session_id
      JOIN master_transporters mt ON mt.id = ss.transporter_id
      JOIN users u ON u.id = ss.operator_id
      WHERE hm.id = ${manifestId}::UUID
    `;

    if (manifest.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Manifest not found' },
        { status: 404 }
      );
    }

    // 🔥 Ambil history logs berdasarkan session_id
    const historyLogs = await sql`
      SELECT 
        id,
        session_code,
        transporter_name,
        resi_number,
        sorting_at,
        sorting_by,
        handover_at,
        handover_by,
        status
      FROM history_logs
      WHERE session_id = ${manifest[0].session_id}::UUID
      ORDER BY 
        CASE 
          WHEN status = 'DONE' THEN 1
          WHEN status = 'CANCELLED' THEN 2
          WHEN status = 'NOT_FOUND' THEN 3
          ELSE 4
        END,
        resi_number ASC
    `;

    return NextResponse.json({
      success: true,
      manifest: manifest[0],
      history_logs: historyLogs,
    });

  } catch (error) {
    console.error('Error fetching manifest detail:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch manifest detail' },
      { status: 500 }
    );
  }
}