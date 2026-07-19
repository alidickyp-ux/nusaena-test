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
    const { 
      vendor_name,
      references, // array of reference
      driver,
      operator,
      security,
      police_number,
      driver_sign,
      security_sign,
    } = body;

    if (!vendor_name || !references || references.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendor and references are required' },
        { status: 400 }
      );
    }

    if (!driver || !operator || !security || !police_number) {
      return NextResponse.json(
        { success: false, message: 'All handover fields are required' },
        { status: 400 }
      );
    }

    if (!driver_sign || !security_sign) {
      return NextResponse.json(
        { success: false, message: 'Signatures are required' },
        { status: 400 }
      );
    }

    // 🔥 Generate delivery number
    // Format: DN23-YYMMDD-XXXX (4 digit random)
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    let random = String(Math.floor(1000 + Math.random() * 9000));
    let deliveryNumber = `DN23-${dateStr}-${random}`;

    // 🔥 Check duplicate delivery number
    let attempts = 0;
    while (attempts < 10) {
      const check = await sql`
        SELECT id FROM manifest_order WHERE delivery_number = ${deliveryNumber}
      `;
      if (check.length === 0) break;
      random = String(Math.floor(1000 + Math.random() * 9000));
      deliveryNumber = `DN23-${dateStr}-${random}`;
      attempts++;
    }

    // 🔥 Update semua putaway yang reference-nya di-loading
    // Gunakan loop untuk update per reference (lebih aman dari SQL injection)
    for (const ref of references) {
      await sql`
        UPDATE b2b_putaway
        SET 
          delivery_number = ${deliveryNumber},
          driver = ${driver},
          operator = ${operator},
          security = ${security},
          police_number = ${police_number},
          driver_sign = ${driver_sign},
          security_sign = ${security_sign}
        WHERE vendor_name = ${vendor_name}
          AND reference = ${ref}
          AND loading_status = 'loading_complete'
      `;
    }

    // 🔥 Hitung total box dan weight untuk vendor ini
    const stats = await sql`
      SELECT 
        COUNT(*) as total_box,
        SUM(weight::DECIMAL) as total_weight
      FROM b2b_putaway
      WHERE vendor_name = ${vendor_name}
        AND delivery_number = ${deliveryNumber}
    `;

    // 🔥 Insert ke manifest_order (delivered_status TIDAK ADA di sini lagi —
    // sudah pindah ke manifest_reference, per-reference)
    const manifest = await sql`
      INSERT INTO manifest_order (
        delivery_number,
        vendor_name,
        total_box,
        total_weight,
        loading_date
      ) VALUES (
        ${deliveryNumber},
        ${vendor_name},
        ${stats[0]?.total_box || 0},
        ${stats[0]?.total_weight || 0},
        NOW()
      )
      RETURNING id, delivery_number, vendor_name, total_box, total_weight
    `;

    // 🔥 Buat satu baris manifest_reference untuk TIAP reference dalam DN ini —
    // tanpa ini, tab "References" di admin selalu kosong untuk DN baru,
    // dan resi/arrive_date per-reference tidak ada tempat disimpan.
    const manifestId = manifest[0].id;
    for (const ref of references) {
      await sql`
        INSERT INTO manifest_reference (
          manifest_id, reference, delivered_status
        ) VALUES (
          ${manifestId}::UUID, ${ref}, 'on_shipping'
        )
        ON CONFLICT (manifest_id, reference) DO NOTHING
      `;
    }

    return NextResponse.json({
      success: true,
      message: '✅ Handover B2B berhasil!',
      data: {
        delivery_number: deliveryNumber,
        vendor_name: vendor_name,
        total_box: stats[0]?.total_box || 0,
        total_weight: stats[0]?.total_weight || 0,
        manifest: manifest[0],
      },
    });

  } catch (error) {
    console.error('Error processing handover:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process handover' },
      { status: 500 }
    );
  }
}