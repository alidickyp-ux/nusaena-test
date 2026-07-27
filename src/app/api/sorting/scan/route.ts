import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // 2. Parse body
    const body = await request.json();
    const { barcode, operator_id, manual_session_id } = body;

    if (!barcode || barcode.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Barcode kosong' },
        { status: 400 }
      );
    }

    const trimmedBarcode = barcode.trim();
    const operatorUuid = operator_id || session.sub;

    // 🔥 JIKA ADA manual_session_id → SCAN KE SESSION MANUAL
    if (manual_session_id) {
      // 🔥 Optimasi: cek session dan duplikat secara paralel (Promise.all)
      const [sessionCheck, duplicate] = await Promise.all([
        sql`
          SELECT status, session_code 
          FROM sorting_sessions 
          WHERE id = ${manual_session_id}::UUID
        `,
        sql`
          SELECT id FROM sorting_details WHERE barcode_resi = ${trimmedBarcode}
        `
      ]);

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

      if (duplicate.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'Barcode sudah pernah discan'
        });
      }

      // Insert (1 query)
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
          ${trimmedBarcode}, 
          ${operatorUuid}::UUID,
          false,
          NULL,
          NULL,
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

    // 🔥 JIKA TIDAK ADA manual_session_id → AUTO SORTING (1 query ke stored function)
    const result = await sql`
      SELECT process_auto_sorting(${trimmedBarcode}, ${operatorUuid}) AS result
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