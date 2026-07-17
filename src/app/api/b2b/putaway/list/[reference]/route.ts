import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { reference: string } }
) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    const reference = decodeURIComponent(params.reference);

    const boxes = await sql`
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
        putaway_by,
        (
          SELECT full_name FROM users WHERE id = putaway_by
        ) as putaway_by_name
      FROM b2b_putaway
      WHERE reference = ${reference}
      ORDER BY created_at ASC
    `;

    // Hitung total
    const total = await sql`
      SELECT 
        COUNT(*) as total_box,
        SUM(weight::DECIMAL) as total_weight
      FROM b2b_putaway
      WHERE reference = ${reference}
    `;

    return NextResponse.json({
      success: true,
      data: {
        reference,
        boxes: boxes,
        total_box: Number(total[0]?.total_box || 0),
        total_weight: Number(total[0]?.total_weight || 0),
      },
    });

  } catch (error) {
    console.error('Error fetching putaway list:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch putaway list' },
      { status: 500 }
    );
  }
}