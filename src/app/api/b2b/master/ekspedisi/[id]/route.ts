import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// PUT: Update ekspedisi
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
    const { vendor_name, weight_price, volume_price, is_active } = body;

    const result = await sql`
      UPDATE master_ekspedisi
      SET 
        vendor_name = COALESCE(${vendor_name}, vendor_name),
        weight_price = COALESCE(${weight_price}, weight_price),
        volume_price = COALESCE(${volume_price}, volume_price),
        is_active = COALESCE(${is_active}, is_active)
      WHERE id = ${id}
      RETURNING id, vendor_name, weight_price, volume_price, is_active
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Ekspedisi not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });

  } catch (error) {
    console.error('Error updating ekspedisi:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update ekspedisi' },
      { status: 500 }
    );
  }
}