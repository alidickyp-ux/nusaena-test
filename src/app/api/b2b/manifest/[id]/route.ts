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

    // 🔥 Ambil manifest dengan JOIN ke manifest_references
    const result = await sql`
      SELECT 
        mo.id,
        mo.delivery_number,
        mo.vendor_name,
        mo.total_box,
        mo.total_weight,
        mo.delivered_status,
        mo.loading_date,
        mo.arrive_date,
        mo.reference_price,
        mo.cost,
        mo.ppn,
        mo.created_at,
        mo.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', mr.id,
              'reference', mr.reference,
              'resi_number', mr.resi_number,
              'cost', mr.cost,
              'ppn', mr.ppn
            )
          ) FILTER (WHERE mr.id IS NOT NULL),
          '[]'
        ) as references
      FROM manifest_order mo
      LEFT JOIN manifest_references mr ON mr.manifest_id = mo.id
      WHERE mo.id = ${id}::UUID
      GROUP BY mo.id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Manifest not found' },
        { status: 404 }
      );
    }

    const manifest = result[0];

    // 🔥 Ambil detail putaway
    const details = await sql`
      SELECT 
        reference,
        box_id,
        box_number,
        weight,
        site,
        staging_location,
        store_name,
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
        details,
      },
    });

  } catch (error) {
    console.error('Error fetching manifest detail:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch manifest detail' },
      { status: 500 }
    );
  }
}

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
      delivered_status, 
      arrive_date,
      references,
      reference_price,
    } = body;

    // Validasi
    if (delivered_status && !['on_the_way', 'arrived'].includes(delivered_status)) {
      return NextResponse.json(
        { success: false, message: 'delivered_status harus on_the_way atau arrived' },
        { status: 400 }
      );
    }

    // 🔥 1. Update manifest_order
    await sql`
      UPDATE manifest_order
      SET 
        delivered_status = ${delivered_status ?? 'on_the_way'},
        arrive_date = ${arrive_date ? new Date(arrive_date) : null},
        reference_price = ${reference_price ?? null},
        updated_at = NOW()
      WHERE id = ${id}::UUID
    `;

    // 🔥 2. Update manifest_references (DELETE + INSERT)
    if (references !== undefined) {
      // Hapus semua references lama
      await sql`
        DELETE FROM manifest_references
        WHERE manifest_id = ${id}::UUID
      `;

      // Insert references baru
      if (references.length > 0) {
        for (const ref of references) {
          if (ref.reference) {
            await sql`
              INSERT INTO manifest_references (
                manifest_id,
                reference,
                resi_number,
                cost,
                ppn
              ) VALUES (
                ${id}::UUID,
                ${ref.reference},
                ${ref.resi_number || null},
                ${ref.cost || null},
                ${ref.ppn || null}
              )
            `;
          }
        }
      }
    }

    // 🔥 3. Ambil data terbaru dengan JOIN
    const result = await sql`
      SELECT 
        mo.id,
        mo.delivery_number,
        mo.vendor_name,
        mo.total_box,
        mo.total_weight,
        mo.delivered_status,
        mo.loading_date,
        mo.arrive_date,
        mo.reference_price,
        mo.cost,
        mo.ppn,
        mo.created_at,
        mo.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', mr.id,
              'reference', mr.reference,
              'resi_number', mr.resi_number,
              'cost', mr.cost,
              'ppn', mr.ppn
            )
          ) FILTER (WHERE mr.id IS NOT NULL),
          '[]'
        ) as references
      FROM manifest_order mo
      LEFT JOIN manifest_references mr ON mr.manifest_id = mo.id
      WHERE mo.id = ${id}::UUID
      GROUP BY mo.id
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Manifest updated successfully',
    });

  } catch (error) {
    console.error('Error updating manifest:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update manifest' },
      { status: 500 }
    );
  }
}