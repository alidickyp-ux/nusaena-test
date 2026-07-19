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
    const { reference, box_id, weight, volume, site, store_name, address, city, province } = body;

    if (!reference || !box_id) {
      return NextResponse.json(
        { success: false, message: 'Reference and box_id are required' },
        { status: 400 }
      );
    }

    // Cek apakah box_id sudah ada
    const existingBox = await sql`
      SELECT id FROM b2b_putaway WHERE box_id = ${box_id}
    `;

    if (existingBox.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Box ID sudah pernah digunakan' },
        { status: 409 }
      );
    }

    const boxNumber = box_id.slice(0, 14);

    // Insert ke b2b_putaway
    const result = await sql`
      INSERT INTO b2b_putaway (
        reference,
        box_id,
        box_number,
        weight,
        volume,
        site,
        staging_location,
        store_name,
        address,
        city,
        province,
        putaway_by,
        loading_status
      ) VALUES (
        ${reference},
        ${box_id},
        ${boxNumber},
        ${weight || null}::DECIMAL,
        ${volume || null}::DECIMAL,
        ${site || null},
        NULL,
        ${store_name || null},
        ${address || null},
        ${city || null},
        ${province || null},
        ${userSession.sub}::UUID,
        'staging'
      )
      RETURNING *
    `;

    // Hitung total box dalam reference
    const totalBox = await sql`
      SELECT COUNT(*) as count FROM b2b_putaway WHERE reference = ${reference}
    `;

    return NextResponse.json({
      success: true,
      message: '✅ Box berhasil dibuat',
      data: result[0],
      total_box: Number(totalBox[0].count),
    });

  } catch (error) {
    console.error('Error creating box:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create box' },
      { status: 500 }
    );
  }
}