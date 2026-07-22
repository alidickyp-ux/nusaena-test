import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { success: false, message: 'Reference is required' },
        { status: 400 }
      );
    }

    // Cek apakah reference sudah ada
    const existing = await sql`
      SELECT 
        id,
        reference,
        box_id,
        box_number,
        weight,
        site,
        staging_location,
        store_name,
        address,
        city,
        province,
        loading_status,
        putaway_at,
        COUNT(*) OVER() as total_box
      FROM b2b_putaway
      WHERE reference = ${reference}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      success: true,
      data: {
        reference,
        is_new: existing.length === 0,
        boxes: existing,
        total_box: existing.length > 0 ? existing[0].total_box : 0,
      },
    });

  } catch (error) {
    console.error('Error scanning reference:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to scan reference' },
      { status: 500 }
    );
  }
}