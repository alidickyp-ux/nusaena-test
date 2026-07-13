import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { session_id, barcode, reason } = body;

    if (!session_id || !barcode || !reason) {
      return NextResponse.json(
        { success: false, message: 'Session ID, barcode, and reason are required' },
        { status: 400 }
      );
    }

    // Validasi reason
    if (!['NOT_FOUND', 'CANCELLED'].includes(reason)) {
      return NextResponse.json(
        { success: false, message: 'Invalid reason. Must be NOT_FOUND or CANCELLED' },
        { status: 400 }
      );
    }

    // Cek apakah barcode ada di session
    const existing = await sql`
      SELECT id, is_validated_handover, discrepancy_reason
      FROM sorting_details
      WHERE session_id = ${session_id}::UUID
        AND barcode_resi = ${barcode}
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Barcode tidak ditemukan di session ini' },
        { status: 404 }
      );
    }

    const current = existing[0];
    let is_validated_handover = true;
    let discrepancy_reason = reason;

    // Jika sudah ada discrepancy yang sama, batalkan (toggle)
    if (current.discrepancy_reason === reason) {
      is_validated_handover = false;
      discrepancy_reason = null;
    }

    // Update sorting_details dengan validated_by dan validated_at
    const updated = await sql`
      UPDATE sorting_details
      SET 
        is_validated_handover = ${is_validated_handover},
        validated_by = ${is_validated_handover ? userSession.sub : null}::UUID,
        validated_at = ${is_validated_handover ? new Date().toISOString() : null}::TIMESTAMPTZ,
        discrepancy_reason = ${discrepancy_reason}
      WHERE id = ${current.id}
      RETURNING id, barcode_resi, is_validated_handover, validated_by, validated_at, discrepancy_reason
    `;

    return NextResponse.json({
      success: true,
      message: is_validated_handover 
        ? `Paket ditandai sebagai ${reason}`
        : `Paket dibatalkan dari discrepancy`,
      data: updated[0],
    });

  } catch (error) {
    console.error('Error marking discrepancy:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to mark discrepancy' },
      { status: 500 }
    );
  }
}