import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    // 🔥 Ambil semua data manifest_order
    const manifests = await sql`
      SELECT 
        id,
        delivery_number,
        vendor_name,
        total_box,
        total_weight,
        delivered_status,
        loading_date,
        arrive_date,
        reference_price,
        cost,
        ppn,
        created_at,
        updated_at
      FROM manifest_order
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      data: manifests,
    });

  } catch (error) {
    console.error('Export manifest error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Gagal export data' },
      { status: 500 }
    );
  }
}