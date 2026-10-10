import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  requireAdmin,
  parseRange,
  tableExists,
  NO_STORE_HEADERS,
} from '@/lib/dashboard-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Activity = {
  type: string;
  id: string;
  created_at: string;
  code: string;
  name: string;
  detail: string;
  total_items: number | string;
};

export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const sp = request.nextUrl.searchParams;

    const parsed = parseRange(sp);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.message },
        { status: 400 }
      );
    }
    const { from, to } = parsed.range;

    const type = sp.get('type') || 'all'; // all | b2c | instant | b2b
    const limit = Math.min(
      Math.max(parseInt(sp.get('limit') || '10', 10) || 10, 1),
      100
    );

    // Pencarian: escape karakter wildcard LIKE supaya input literal
    const q = (sp.get('q') || '').trim().slice(0, 100);
    const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    const hasQ = q !== '';

    const wantB2C = type === 'all' || type === 'b2c';
    const wantInstant = type === 'all' || type === 'instant';
    const wantB2B = type === 'all' || type === 'b2b';

    // Ambil limit + 1 dari tiap sumber, lalu gabung & potong.
    // Satu baris ekstra dipakai untuk tahu apakah masih ada data (hasMore).
    const take = limit + 1;
    let all: Activity[] = [];

    // ---------- B2C Handover ----------
    if (wantB2C) {
      const rows = await sql`
        SELECT
          'handover' as type,
          hm.id::text as id,
          hm.signed_at as created_at,
          ss.session_code as code,
          mt.transporter_name as name,
          hm.courier_name as detail,
          hm.total_packages_handed as total_items
        FROM handover_manifests hm
        JOIN sorting_sessions ss ON ss.id = hm.session_id
        JOIN master_transporters mt ON mt.id = ss.transporter_id
        WHERE (hm.signed_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
          AND (
            ${hasQ}::boolean = false
            OR ss.session_code ILIKE ${pattern}
            OR mt.transporter_name ILIKE ${pattern}
            OR hm.courier_name ILIKE ${pattern}
          )
        ORDER BY hm.signed_at DESC
        LIMIT ${take}
      `;
      all = all.concat(rows as Activity[]);
    }

    // ---------- B2B Loading (1 delivery number = 1 aktivitas) ----------
    if (wantB2B && (await tableExists('b2b_putaway'))) {
      try {
        const rows = await sql`
          SELECT
            'b2b_loading' as type,
            MAX(id)::text as id,
            MAX(loading_at) as created_at,
            delivery_number as code,
            vendor_name as name,
            CONCAT(
              COUNT(*)::text, ' box · ',
              COUNT(DISTINCT reference)::text, ' reference'
            ) as detail,
            COUNT(*) as total_items
          FROM b2b_putaway
          WHERE delivery_number IS NOT NULL
            AND loading_at IS NOT NULL
            AND deleted_at IS NULL
            AND (loading_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
            AND (
              ${hasQ}::boolean = false
              OR delivery_number ILIKE ${pattern}
              OR vendor_name ILIKE ${pattern}
            )
          GROUP BY delivery_number, vendor_name
          ORDER BY MAX(loading_at) DESC
          LIMIT ${take}
        `;
        all = all.concat(rows as Activity[]);
      } catch (err) {
        console.warn('⚠️ Error fetching B2B activity:', err);
      }
    }

    // ---------- Instant Pickup ----------
    if (wantInstant && (await tableExists('instant_packages'))) {
      try {
        const rows = await sql`
          SELECT
            'instant_pickup' as type,
            ip.id::text as id,
            ip.picked_at as created_at,
            ip.barcode_resi as code,
            mt.transporter_name as name,
            ip.location_code as detail,
            1 as total_items
          FROM instant_packages ip
          JOIN master_transporters mt ON mt.id = ip.transporter_id
          WHERE ip.picked_at IS NOT NULL
            AND (ip.picked_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
            AND (
              ${hasQ}::boolean = false
              OR ip.barcode_resi ILIKE ${pattern}
              OR mt.transporter_name ILIKE ${pattern}
              OR ip.location_code ILIKE ${pattern}
            )
          ORDER BY ip.picked_at DESC
          LIMIT ${take}
        `;
        all = all.concat(rows as Activity[]);
      } catch (err) {
        console.warn('⚠️ Error fetching instant activity:', err);
      }
    }

    all.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const hasMore = all.length > limit;
    const activities = all.slice(0, limit).map((a) => ({
      ...a,
      total_items: Number(a.total_items) || 0,
    }));

    return NextResponse.json(
      { success: true, activities, hasMore },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error fetching dashboard activity:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}