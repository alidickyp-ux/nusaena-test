import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { transporter_id, operator_id } = body;

    if (!transporter_id) {
      return NextResponse.json(
        { success: false, message: 'Transporter ID is required' },
        { status: 400 }
      );
    }

    // 1. Cek transporter di master_3pl
    const transporterCheck = await sql`
      SELECT id, transporter_name 
      FROM master_3pl 
      WHERE id = ${transporter_id} AND is_active = true
    `;

    if (transporterCheck.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Transporter tidak ditemukan' },
        { status: 404 }
      );
    }

    const transporterName = transporterCheck[0].transporter_name;

    // 2. Cari di master_transporters
    const transporterMap = await sql`
      SELECT id FROM master_transporters 
      WHERE transporter_name ILIKE ${'%' + transporterName + '%'}
      LIMIT 1
    `;

    const actualTransporterId = transporterMap.length > 0 
      ? transporterMap[0].id 
      : transporter_id;

    // 3. Buat session manual langsung (tanpa fungsi)
    const dateStr = new Date().toISOString().slice(8, 10) + 
                    new Date().toISOString().slice(5, 7) + 
                    new Date().toISOString().slice(2, 4);

    const seqResult = await sql`
      SELECT COALESCE(MAX(CAST(SUBSTRING(session_code FROM '-\\d+$') AS INTEGER)), 0) + 1 as seq
      FROM sorting_sessions
      WHERE transporter_id = ${actualTransporterId}
        AND created_at::DATE = CURRENT_DATE
        AND session_code LIKE '%' || ${dateStr} || '-%'
    `;

    let seq = seqResult[0]?.seq || 1;
    let sessionCode = transporterName.toLowerCase().replace(/[^a-z0-9]/g, '') 
      + dateStr + '-' + String(seq).padStart(3, '0');

    // Anti-duplikat
    let attempts = 0;
    while (attempts < 10) {
      const check = await sql`
        SELECT id FROM sorting_sessions WHERE session_code = ${sessionCode}
      `;
      if (check.length === 0) break;
      seq++;
      sessionCode = transporterName.toUpperCase().replace(/[^a-z0-9]/g, '') 
        + dateStr + '-' + String(seq).padStart(3, '0');
      attempts++;
    }

    const newSession = await sql`
      INSERT INTO sorting_sessions (
        session_code,
        transporter_id,
        operator_id,
        status,
        created_at
      ) VALUES (
        ${sessionCode},
        ${actualTransporterId},
        ${operator_id || session.sub}::UUID,
        'RUNNING',
        NOW()
      )
      RETURNING id, session_code
    `;

    return NextResponse.json({
      success: true,
      message: `Session manual ${sessionCode} berhasil dibuat`,
      session_id: newSession[0].id,
      session_code: newSession[0].session_code,
      transporter: transporterName,
    });

  } catch (error) {
    console.error('Error creating manual session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create manual session' },
      { status: 500 }
    );
  }
}