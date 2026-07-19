import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const boxId = params.id;
    console.log("🔍 Fetching box by ID:", boxId);

    const result = await sql`
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
        delivery_number
      FROM b2b_putaway
      WHERE box_id = ${boxId}
      LIMIT 1
    `;

    console.log("📦 Box found:", result.length > 0 ? result[0] : "Not found");

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Box not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });

  } catch (error) {
    console.error('Error fetching box:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch box' },
      { status: 500 }
    );
  }
}