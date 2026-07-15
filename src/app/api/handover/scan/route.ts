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
    const { session_id, barcode } = body;

    if (!session_id || !barcode) {
      return NextResponse.json(
        { success: false, message: 'Session ID and barcode required' },
        { status: 400 }
      );
    }

    // Cek session
    const sessionCheck = await sql`
      SELECT id, status FROM sorting_sessions 
      WHERE id = ${session_id}::UUID
    `;

    if (sessionCheck.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Session not found' },
        { status: 404 }
      );
    }

    if (sessionCheck[0].status !== 'RUNNING') {
      return NextResponse.json(
        { success: false, message: 'Session already closed' },
        { status: 400 }
      );
    }

    // Cek barcode di session ini
    const barcodeCheck = await sql`
      SELECT id, is_validated_handover 
      FROM sorting_details 
      WHERE session_id = ${session_id}::UUID 
        AND barcode_resi = ${barcode}
    `;

    if (barcodeCheck.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Barcode tidak ditemukan di session ini' },
        { status: 404 }
      );
    }

    if (barcodeCheck[0].is_validated_handover) {
      return NextResponse.json(
        { success: false, message: 'Barcode sudah discan sebelumnya' },
        { status: 400 }
      );
    }

    // Update status jadi validated
    await sql`
      UPDATE sorting_details 
      SET 
        is_validated_handover = true,
        validated_by = ${session.sub}::UUID,
        validated_at = NOW()
      WHERE id = ${barcodeCheck[0].id}
    `;

    // Hitung sisa
    const remaining = await sql`
      SELECT COUNT(*) as count 
      FROM sorting_details 
      WHERE session_id = ${session_id}::UUID 
        AND is_validated_handover = false
    `;

    return NextResponse.json({
      success: true,
      message: '✅ Barcode berhasil diverifikasi',
      barcode: barcode,
      remaining: remaining[0].count,
    });

  } catch (error) {
    console.error('Error in handover scan:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to scan barcode' },
      { status: 500 }
    );
  }
}