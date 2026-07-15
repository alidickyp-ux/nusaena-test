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
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }

    const sessionId = params.id;

    // Ambil detail session
    const sessionDetail = await sql`
      SELECT 
        ss.id,
        ss.session_code,
        ss.status,
        ss.created_at,
        mt.transporter_name,
        u.full_name as operator_name,
        COUNT(sd.id) as total_items,
        COUNT(sd.id) - COUNT(CASE WHEN sd.is_validated_handover = true THEN 1 END) as remaining_items
      FROM sorting_sessions ss
      LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
      LEFT JOIN users u ON u.id = ss.operator_id
      LEFT JOIN sorting_details sd ON sd.session_id = ss.id
      WHERE ss.id = ${sessionId}::UUID
      GROUP BY 
        ss.id, 
        ss.session_code, 
        ss.status, 
        ss.created_at,
        mt.transporter_name, 
        u.full_name
    `;

    if (sessionDetail.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Session not found' },
        { status: 404 }
      );
    }

    // Ambil daftar resi untuk verify mode
    const items = await sql`
      SELECT 
        sd.id,
        sd.barcode_resi,
        sd.scanned_at,
        sd.is_validated_handover,
        sd.discrepancy_reason
      FROM sorting_details sd
      WHERE sd.session_id = ${sessionId}::UUID
      ORDER BY sd.scanned_at ASC
    `;

    return NextResponse.json({
      success: true,
      session: sessionDetail[0],
      items: items,
    });

  } catch (error) {
    console.error('Error fetching session detail:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch session detail' },
      { status: 500 }
    );
  }
}