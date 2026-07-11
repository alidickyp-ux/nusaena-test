import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { barcode, operator_id, manual_session_id } = body;

    if (!barcode || barcode.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Barcode kosong' },
        { status: 400 }
      );
    }

    // 🔥 JIKA ADA manual_session_id → SCAN KE SESSION MANUAL
    if (manual_session_id) {
      // Cek session valid
      const sessionCheck = await sql`
        SELECT status, session_code 
        FROM sorting_sessions 
        WHERE id = ${manual_session_id}::UUID
      `;

      if (sessionCheck.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Session tidak ditemukan'
        });
      }

      if (sessionCheck[0].status !== 'RUNNING') {
        return NextResponse.json({
          success: false,
          message: 'Session sudah ditutup'
        });
      }

      // Cek duplikat barcode
      const duplicate = await sql`
        SELECT id FROM sorting_details WHERE barcode_resi = ${barcode.trim()}
      `;

      if (duplicate.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'Barcode sudah pernah discan'
        });
      }

      // 🔥 INSERT KE SESSION MANUAL dengan semua field
      await sql`
        INSERT INTO sorting_details (
          session_id, 
          barcode_resi, 
          sorting_by,
          is_validated_handover,
          validated_by,
          validated_at,
          scanned_at
        ) VALUES (
          ${manual_session_id}::UUID, 
          ${barcode.trim()}, 
          ${operator_id || session.sub}::UUID,
          false,           -- 🔥 BELUM di-handover
          NULL,            -- 🔥 BELUM divalidasi
          NULL,            -- 🔥 BELUM ada tanggal validasi
          NOW()
        )
      `;

      return NextResponse.json({
        success: true,
        message: `✅ Barcode discan ke session ${sessionCheck[0].session_code}`,
        session_code: sessionCheck[0].session_code,
        manual: true,
        is_validated: false
      });
    }

    // 🔥 JIKA TIDAK ADA manual_session_id → AUTO SORTING
    const result = await sql`
      SELECT process_auto_sorting(${barcode.trim()}, ${operator_id || session.sub}) AS result
    `;

    return NextResponse.json(result[0].result);

  } catch (error) {
    console.error('Error in sorting scan:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Terjadi kesalahan sistem' 
      },
      { status: 500 }
    );
  }
}