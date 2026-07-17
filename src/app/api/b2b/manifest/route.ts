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
        resi_number,
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
    console.error('Error fetching manifests:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch manifests' },
      { status: 500 }
    );
  }
}