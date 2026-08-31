import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';

interface SoListRow {
  id: string;
  so_number: string;
  customer: string | null;
  status: string;
  total_qty_so: string | number;
  total_qty_picked: string | number;
}

// GET /api/b2b/picking
// List SO yang statusnya masih perlu dipick
export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const rows = (await sql`
      select
        so.id,
        so.so_number,
        so.customer,
        so.status,
        coalesce(sum(sl.qty_so), 0) as total_qty_so,
        coalesce(sum(sl.qty_picked), 0) as total_qty_picked
      from sales_orders so
      left join so_lines sl on sl.so_id = so.id
      where so.status in ('DRAFT', 'PICKING')
      group by so.id, so.so_number, so.customer, so.status
      order by so.created_at desc
    `) as SoListRow[];

    return NextResponse.json({
      orders: rows.map((r) => ({
        id: r.id,
        soNumber: r.so_number,
        customer: r.customer,
        status: r.status,
        totalQtySo: Number(r.total_qty_so),
        totalQtyPicked: Number(r.total_qty_picked),
      })),
    });
  } catch (error) {
    console.error('Error fetching picking orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// ... import dan GET di atas

type FlagType = 'DAMAGED' | 'SHORT' | 'FOUND' | null;

interface PickingBody {
  pickingSessionId: string;
  soLineId: string;
  artikel: string;
  location: string;
  qtyPicked: number;
  flagType?: FlagType;
  flagNote?: string;
}

interface SoLineQtyRow {
  qty_so: string | number;
  qty_picked: string | number;
}

// POST /api/b2b/picking
// Simpan satu baris picking, lalu update akumulasi qty_picked di so_lines
export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body: PickingBody = await req.json();
    const { pickingSessionId, soLineId, artikel, location, qtyPicked, flagType, flagNote } = body;

    if (!pickingSessionId || !soLineId || !artikel || !location || !qtyPicked) {
      return NextResponse.json({ error: 'Field wajib belum lengkap' }, { status: 400 });
    }

    // 🔥 Flag note wajib hanya untuk DAMAGED dan SHORT (FOUND opsional)
    if ((flagType === 'DAMAGED' || flagType === 'SHORT') && !flagNote) {
      return NextResponse.json(
        { error: 'flagNote wajib diisi untuk DAMAGED atau SHORT' },
        { status: 400 }
      );
    }

    // Cek sisa qty di so_lines
    const [line] = (await sql`
      select qty_so, qty_picked from so_lines where id = ${soLineId}
    `) as SoLineQtyRow[];
    
    if (!line) {
      return NextResponse.json({ error: 'so_line tidak ditemukan' }, { status: 404 });
    }

    const remaining = Number(line.qty_so) - Number(line.qty_picked);
    
    // Cek jika qty melebihi sisa dan tidak ada flag
    if (qtyPicked > remaining && !flagType) {
      return NextResponse.json(
        {
          error: `Qty melebihi sisa SO (sisa ${remaining}). Tandai flag jika ini memang kelebihan/temuan.`,
        },
        { status: 409 }
      );
    }

    // Insert picking line
    await sql`
      insert into picking_lines
        (picking_session_id, so_line_id, artikel, location, qty_picked, flag_type, flag_note)
      values
        (${pickingSessionId}, ${soLineId}, ${artikel}, ${location}, ${qtyPicked}, ${flagType ?? null}, ${flagNote ?? null})
    `;

    // Update qty_picked di so_lines
    await sql`
      update so_lines
      set qty_picked = qty_picked + ${qtyPicked}
      where id = ${soLineId}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error saving picking:', error);
    return NextResponse.json(
      { error: 'Failed to save picking' },
      { status: 500 }
    );
  }
}