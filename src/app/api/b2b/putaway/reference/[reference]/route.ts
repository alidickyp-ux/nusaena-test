import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 🔥 GET: Ambil Ship To berdasarkan reference
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

    const result = await sql`
      SELECT 
        site,
        store_name,
        address,
        city,
        province
      FROM b2b_putaway
      WHERE reference = ${reference}
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Reference not found in b2b_putaway' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });

  } catch (error) {
    console.error('Error fetching reference data:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch reference data' },
      { status: 500 }
    );
  }
}

// 🔥 PUT: Update Ship To berdasarkan reference
export async function PUT(
  request: NextRequest,
  { params }: { params: { reference: string } }
) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const reference = decodeURIComponent(params.reference);
    const body = await request.json();
    const { site, store_name, address, city, province } = body;

    console.log('📦 Updating ship to for reference:', reference, { site, store_name, address, city, province });

    // 🔥 Update semua box dengan reference yang sama
    const result = await sql`
      UPDATE b2b_putaway
      SET 
        site = ${site || null},
        store_name = ${store_name || null},
        address = ${address || null},
        city = ${city || null},
        province = ${province || null},
        updated_at = NOW()
      WHERE reference = ${reference}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Reference not found in b2b_putaway' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Ship To updated successfully',
    });

  } catch (error) {
    console.error('Error updating ship to:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update ship to' },
      { status: 500 }
    );
  }
}