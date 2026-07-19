// app/api/b2b/manifest/references/all/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    // 1. 🔥 Ambil reference yang SUDAH punya DN
    const references = await sql`
      SELECT 
        mr.id,
        mr.manifest_id,
        mr.reference,
        mr.resi_number,
        mr.delivered_status,
        mr.arrive_date,
        mr.created_at,
        mr.updated_at,
        mo.delivery_number,
        mo.vendor_name,
        mo.loading_date,
        TRUE as has_dn
      FROM manifest_reference mr
      INNER JOIN manifest_order mo ON mo.id = mr.manifest_id
      ORDER BY mo.delivery_number ASC, mr.reference ASC
    `;

    // 2. 🔥 Ambil reference yang TANPA DN
    const referencesWithoutDN = await sql`
      SELECT DISTINCT
        reference,
        NULL as id,
        NULL as manifest_id,
        NULL as resi_number,
        NULL as delivered_status,
        NULL as arrive_date,
        MAX(putaway_at) as created_at,
        NULL as updated_at,
        NULL as delivery_number,
        NULL as vendor_name,
        NULL as loading_date,
        FALSE as has_dn,
        MAX(box_id) as box_id,
        MAX(site) as site,
        MAX(store_name) as store_name,
        MAX(address) as address,
        MAX(city) as city,
        MAX(province) as province,
        COUNT(*) as total_box
      FROM b2b_putaway
      WHERE delivery_number IS NULL
      AND loading_status = 'staging'
      GROUP BY reference
    `;

    // 3. Gabungkan hasil
    const allReferences = [...references, ...referencesWithoutDN];

    // Urutkan berdasarkan delivery_number (NULL di akhir)
    allReferences.sort((a, b) => {
      if (!a.delivery_number) return 1;
      if (!b.delivery_number) return -1;
      return a.delivery_number.localeCompare(b.delivery_number);
    });

    return NextResponse.json({
      success: true,
      data: allReferences,
    });

  } catch (error) {
    console.error('Error fetching all references:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch references' },
      { status: 500 }
    );
  }
}