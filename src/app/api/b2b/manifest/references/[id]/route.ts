import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const id = params.id;
    const body = await request.json();
    const { 
      resi_number, 
      arrive_date,
      site,
      store_name,
      address,
      city,
      province,
    } = body;

    // 🔥 1. Update manifest_reference
    const result = await sql`
      UPDATE manifest_reference
      SET 
        resi_number = ${resi_number || null},
        arrive_date = ${arrive_date ? new Date(arrive_date) : null},
        delivered_status = ${arrive_date ? 'arrived' : 'on_shipping'},
        updated_at = NOW()
      WHERE id = ${id}::UUID
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Reference not found' },
        { status: 404 }
      );
    }

    // 🔥 2. Update b2b_putaway untuk semua box dengan reference yang sama
    const manifestRef = result[0];
    if (manifestRef.reference) {
      await sql`
        UPDATE b2b_putaway
        SET 
          site = ${site || null},
          store_name = ${store_name || null},
          address = ${address || null},
          city = ${city || null},
          province = ${province || null},
          updated_at = NOW()
        WHERE reference = ${manifestRef.reference}
      `;
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Reference updated successfully',
    });

  } catch (error) {
    console.error('Error updating reference:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update reference' },
      { status: 500 }
    );
  }
}