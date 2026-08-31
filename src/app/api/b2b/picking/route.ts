import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db'; // sesuaikan dengan koneksi Neon yang sudah ada di project

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

interface SoListRow {
  id: string;
  so_number: string;
  customer: string | null;
  status: string;
  total_qty_so: string | number;
  total_qty_picked: string | number;
}

// GET /api/b2b/picking
// List SO yang statusnya masih perlu dipick, untuk halaman index picking.
export async function GET() {
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
}

// POST /api/b2b/picking
// Simpan satu baris picking, lalu update akumulasi qty_picked di so_lines.
// qtyPicked boleh melebihi sisa SO HANYA jika flagType diisi (mis. FOUND).
export async function POST(req: NextRequest) {
  const body: PickingBody = await req.json();
  const { pickingSessionId, soLineId, artikel, location, qtyPicked, flagType, flagNote } = body;

  if (!pickingSessionId || !soLineId || !artikel || !location || !qtyPicked) {
    return NextResponse.json({ error: 'Field wajib belum lengkap' }, { status: 400 });
  }

  if ((flagType === 'DAMAGED' || flagType === 'SHORT' || flagType === 'FOUND') && !flagNote) {
    return NextResponse.json(
      { error: 'flagNote wajib diisi kalau ada flagType' },
      { status: 400 }
    );
  }

  const [line] = (await sql`
    select qty_so, qty_picked from so_lines where id = ${soLineId}
  `) as SoLineQtyRow[];
  if (!line) {
    return NextResponse.json({ error: 'so_line tidak ditemukan' }, { status: 404 });
  }

  const remaining = Number(line.qty_so) - Number(line.qty_picked);
  if (qtyPicked > remaining && !flagType) {
    return NextResponse.json(
      {
        error: `Qty melebihi sisa SO (sisa ${remaining}). Tandai flag jika ini memang kelebihan/temuan.`,
      },
      { status: 409 }
    );
  }

  await sql`
    insert into picking_lines
      (picking_session_id, so_line_id, artikel, location, qty_picked, flag_type, flag_note)
    values
      (${pickingSessionId}, ${soLineId}, ${artikel}, ${location}, ${qtyPicked}, ${flagType ?? null}, ${flagNote ?? null})
  `;

  await sql`
    update so_lines
    set qty_picked = qty_picked + ${qtyPicked}
    where id = ${soLineId}
  `;

  return NextResponse.json({ ok: true });
}