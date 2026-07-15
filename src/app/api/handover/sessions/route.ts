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

    // 🔥 FIX: Cast hasil COUNT ke ::INT agar terbaca angka (number), bukan string
    // 🔥 GANTI KUERI SELECT LAMA ANDA DENGAN LOGIKA SUM ::INT YANG JAUH LEBIH STABIL
const sessions = await sql`
  SELECT 
    ss.id,
    ss.session_code,
    ss.status,
    ss.created_at,
    ss.closed_at,
    mt.transporter_name,
    u.full_name as operator_name,
    COALESCE(COUNT(sd.id)::INT, 0) as total_items,
    
    -- Hitung sisa item yang BELUM di-handover (is_validated_handover = false)
    COALESCE(
      SUM(CASE WHEN sd.is_validated_handover = false THEN 1 ELSE 0 END)::INT, 
      0
    ) as remaining_items,
    
    -- Hitung item yang SUDAH di-handover (is_validated_handover = true)
    COALESCE(
      SUM(CASE WHEN sd.is_validated_handover = true THEN 1 ELSE 0 END)::INT, 
      0
    ) as validated_items
    
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
    ss.closed_at,
    mt.transporter_name, 
    u.full_name
  ORDER BY ss.created_at DESC
`;

    // Debug log untuk memastikan konversi tipe data angka sukses
    console.log(`📊 Handover sessions found: ${sessions.length}`);

    return NextResponse.json({
      success: true,
      sessions: sessions,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Error fetching handover sessions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}