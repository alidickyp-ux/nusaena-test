import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

// GET /api/b2b/picking/so/[soId]/progress
// Mengembalikan progress per lokasi untuk SO tertentu
export async function GET(
  req: NextRequest,
  { params }: { params: { soId: string } }
) {
  try {
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { soId } = params;

    if (!soId) {
      return NextResponse.json({ error: 'soId wajib diisi' }, { status: 400 });
    }

    const rows = await sql`
      SELECT 
        location,
        SUM(qty_so) as total,
        SUM(qty_picked) as picked,
        SUM(qty_so - qty_picked) as remaining
      FROM so_lines
      WHERE so_id = ${soId}
      GROUP BY location
      ORDER BY location
    `;

    const locations = rows.map((r: any) => ({
      location: r.location,
      total: Number(r.total),
      picked: Number(r.picked),
      remaining: Number(r.remaining),
      progress: Number(r.total) > 0 ? Math.round((Number(r.picked) / Number(r.total)) * 100) : 0,
    }));

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}