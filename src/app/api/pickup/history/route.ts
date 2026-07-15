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
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Ambil history paket instan
    const history = await sql`
      SELECT 
        h.id,
        h.session_code,
        h.transporter_name,
        h.resi_number,
        h.status,
        h.handover_at,
        h.handover_by,
        h.location_code,
        h.putaway_by,
        h.picked_by,
        h.is_instant
      FROM history_logs h
      WHERE h.is_instant = true
      ORDER BY h.handover_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({
      success: true,
      data: history,
    });

  } catch (error) {
    console.error('Error fetching instant history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}