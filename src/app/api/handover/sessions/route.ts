// src/app/api/handover/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    // 🔥 HANYA session yang masih punya paket BELUM di-handover (remaining_items > 0)
    const sessions = await sql`
      SELECT 
        ss.id,
        ss.session_code,
        ss.status,
        ss.created_at,
        mt.transporter_name,
        u.full_name as operator_name,
        COALESCE(COUNT(sd.id), 0) as total_items,
        COALESCE(COUNT(sd.id) - COUNT(CASE WHEN sd.is_validated_handover = true THEN 1 END), 0) as remaining_items,
        COALESCE(COUNT(CASE WHEN sd.is_validated_handover = true THEN 1 END), 0) as validated_items
      FROM sorting_sessions ss
      LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
      LEFT JOIN users u ON u.id = ss.operator_id
      LEFT JOIN sorting_details sd ON sd.session_id = ss.id
      WHERE ss.status = 'RUNNING'
      GROUP BY 
        ss.id, 
        ss.session_code, 
        ss.status, 
        ss.created_at,
        mt.transporter_name, 
        u.full_name
      HAVING 
        COALESCE(COUNT(sd.id) - COUNT(CASE WHEN sd.is_validated_handover = true THEN 1 END), 0) > 0
      ORDER BY ss.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      sessions: sessions,
    });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}