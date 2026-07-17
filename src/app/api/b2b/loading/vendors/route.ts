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

    // 🔥 Ambil semua vendor dari master_ekspedisi yang aktif
    const vendors = await sql`
      SELECT 
        id as vendor_id,
        vendor_name,
        weight_price,
        volume_price,
        is_active
      FROM master_ekspedisi
      WHERE is_active = true
      ORDER BY vendor_name ASC
    `;

    return NextResponse.json({
      success: true,
      data: vendors || [],
    });

  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch vendors',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}