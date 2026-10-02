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
    const { reference, box_id, site, staging_location } = body;

    if (!reference || !box_id || !site) {
      return NextResponse.json(
        { success: false, message: 'Reference, box_id, and site are required' },
        { status: 400 }
      );
    }

    // 🔥 Trim input
    const cleanReference = String(reference).trim();
    const cleanBoxId = String(box_id).trim();
    const cleanSite = String(site).trim();

    // 🔥 Parse box_id
    // Format: PCB23-26002071BOX-01-15.6
    //   - box_number = kode satuan + nomor (BOX-01, KAR-01, DUS-01, dst),
    //     ditangkap generic sebagai [huruf][optional "-"][angka]
    //   - weight = angka di AKHIR string, setelah pemisah terakhir "-" atau "#"
    const weightMatch = cleanBoxId.match(/[-#]([\d.]+)$/);
    const weight = weightMatch ? weightMatch[1] : null;

    const boxNumberMatch = cleanBoxId.match(/([A-Z]+-?\d+)(?=[-#][\d.]+$)/i);
    const boxNumber = boxNumberMatch ? boxNumberMatch[1] : cleanBoxId.slice(0, 50);

    // 🔥 existingBox check & storeData lookup paralel (Promise.all)
    const [existingBox, storeData] = await Promise.all([
      sql`SELECT id FROM b2b_putaway WHERE box_id = ${cleanBoxId}`,
      sql`
        SELECT store_name, address, city, province
        FROM master_store
        WHERE UPPER(TRIM(site)) = UPPER(${cleanSite}) AND is_active = true
        LIMIT 1
      `,
    ]);

    if (existingBox.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Box ID sudah pernah discan' },
        { status: 409 }
      );
    }

    // 🔥 VALIDASI BARU: Site HARUS terdaftar di master_store
    if (storeData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `❌ Site "${cleanSite}" tidak terdaftar di master store. Update dulu di master store sebelum melakukan putaway.`,
        },
        { status: 400 }
      );
    }

    const store = storeData[0];

    // 🔥 Insert ke b2b_putaway sekaligus hitung total_box dalam reference yang sama
    const result = await sql`
      INSERT INTO b2b_putaway (
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
        putaway_by,
        loading_status
      ) VALUES (
        ${cleanReference},
        ${cleanBoxId},
        ${boxNumber},
        ${weight},
        ${cleanSite},
        ${staging_location || null},
        ${store.store_name || null},
        ${store.address || null},
        ${store.city || null},
        ${store.province || null},
        ${userSession.sub}::UUID,
        'staging'
      )
      RETURNING
        id, reference, box_id, box_number, weight, site, staging_location, loading_status,
        (SELECT COUNT(*) FROM b2b_putaway WHERE reference = ${cleanReference}) AS total_box
    `;

    const row = result[0];
    const { total_box, ...data } = row;

    return NextResponse.json({
      success: true,
      message: '✅ Box berhasil discan',
      data,
      total_box: Number(total_box),
    });

  } catch (error) {
    console.error('Error scanning box:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to scan box' },
      { status: 500 }
    );
  }
}