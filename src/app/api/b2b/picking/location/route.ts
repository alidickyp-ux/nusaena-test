import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

interface SoLineRow {
  id: string;
  artikel: string;
  description: string | null;
  location: string;
  qty_so: string | number;
  qty_picked: string | number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/b2b/picking/location?soId=...&location=...
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

    const soId = req.nextUrl.searchParams.get('soId');
    const location = req.nextUrl.searchParams.get('location');

    if (!soId || !location) {
      return NextResponse.json(
        { error: 'soId dan location wajib diisi' },
        { status: 400 }
      );
    }

    if (!UUID_RE.test(soId)) {
      return NextResponse.json(
        { error: `soId tidak valid: "${soId}"` },
        { status: 400 }
      );
    }

    const rows = (await sql`
      select id, artikel, description, location, qty_so, qty_picked
      from so_lines
      where so_id = ${soId} and location = ${location}
      order by artikel
    `) as SoLineRow[];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Lokasi ini tidak terdaftar untuk SO tersebut' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      lines: rows.map((r: SoLineRow) => ({
        soLineId: r.id,
        artikel: r.artikel,
        description: r.description,
        location: r.location,
        qtySo: Number(r.qty_so),
        qtyPicked: Number(r.qty_picked),
        qtyRemaining: Number(r.qty_so) - Number(r.qty_picked),
      })),
    });
  } catch (error) {
    console.error('Error fetching location lines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}