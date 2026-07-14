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
    const { barcode, location_code } = body;

    if (!barcode || !location_code) {
      return NextResponse.json(
        { success: false, message: 'Barcode and location code are required' },
        { status: 400 }
      );
    }

    // 🔥 Panggil fungsi putaway_instant_package (tanpa session_id)
    const result = await sql`
      SELECT putaway_instant_package(
        ${barcode},
        ${location_code},
        ${userSession.sub}::UUID
      ) AS result
    `;

    return NextResponse.json(result[0].result);

  } catch (error) {
    console.error('Error in putaway scan:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to putaway package' },
      { status: 500 }
    );
  }
}