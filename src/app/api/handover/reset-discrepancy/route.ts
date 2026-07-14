import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';


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
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Reset semua discrepancy di session
    const updated = await sql`
      UPDATE sorting_details
      SET 
        is_validated_handover = false,
        validated_by = NULL,
        validated_at = NULL,
        discrepancy_reason = NULL
      WHERE session_id = ${session_id}::UUID
        AND discrepancy_reason IS NOT NULL
      RETURNING id, barcode_resi, is_validated_handover, validated_by, validated_at, discrepancy_reason
    `;

    return NextResponse.json({
      success: true,
      message: `${updated.length} discrepancy direset`,
      data: updated,
    });

  } catch (error) {
    console.error('Error resetting discrepancy:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reset discrepancy' },
      { status: 500 }
    );
  }
}