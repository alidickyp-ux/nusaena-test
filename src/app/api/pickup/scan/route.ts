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

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { barcode } = body;

    if (!barcode) {
      return NextResponse.json(
        { success: false, message: 'Barcode is required' },
        { status: 400 }
      );
    }

    // 🔥 Panggil fungsi pickup_instant_package (tanpa manifest)
    const result = await sql`
      SELECT pickup_instant_package(
        ${barcode},
        ${userSession.sub}::UUID
      ) AS result
    `;

    return NextResponse.json(result[0].result);

  } catch (error) {
    console.error('Error in pickup scan:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to pickup package' },
      { status: 500 }
    );
  }
}