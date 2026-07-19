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

    const id = params.id;

    // 1. Ambil manifest header
    const manifestResult = await sql`
      SELECT 
        id,
        delivery_number,
        vendor_name,
        total_box,
        total_weight,
        loading_date,
        created_at,
        updated_at
      FROM manifest_order
      WHERE id = ${id}::UUID
    `;

    if (manifestResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Manifest not found' },
        { status: 404 }
      );
    }

    const manifest = manifestResult[0];

    // 2. Ambil references
    const references = await sql`
      SELECT 
        id,
        manifest_id,
        reference,
        resi_number,
        delivered_status,
        arrive_date,
        created_at,
        updated_at
      FROM manifest_reference
      WHERE manifest_id = ${id}::UUID
      ORDER BY reference ASC
    `;

    const referencesWithDelivery = references.map((ref: any) => ({
      ...ref,
      delivery_number: manifest.delivery_number,
      vendor_name: manifest.vendor_name,
    }));

    // 3. Ambil detail putaway
    const details = await sql`
      SELECT 
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
        driver,
        operator,
        security,
        police_number,
        driver_sign,
        security_sign,
        putaway_at,
        loading_at
      FROM b2b_putaway
      WHERE delivery_number = ${manifest.delivery_number}
      ORDER BY reference ASC, created_at ASC
    `;

    return NextResponse.json({
      success: true,
      data: {
        manifest,
        references: referencesWithDelivery,
        details,
      },
    });

  } catch (error) {
    console.error('Error fetching manifest detail:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch manifest detail' },
      { status: 500 }
    );
  }
}