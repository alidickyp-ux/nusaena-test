import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// PUT: Update store
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const id = parseInt(params.id);
    const body = await request.json();
    const { site, store_name, address, city, province, is_active } = body;

    const result = await sql`
      UPDATE master_store
      SET 
        site = COALESCE(${site}, site),
        store_name = COALESCE(${store_name}, store_name),
        address = COALESCE(${address}, address),
        city = COALESCE(${city}, city),
        province = COALESCE(${province}, province),
        is_active = COALESCE(${is_active}, is_active)
      WHERE id = ${id}
      RETURNING id, site, store_name, address, city, province, is_active
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });

  } catch (error) {
    console.error('Error updating store:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update store' },
      { status: 500 }
    );
  }
}