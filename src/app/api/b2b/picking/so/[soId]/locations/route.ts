import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

// GET /api/b2b/picking/so/[soId]/locations
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
      SELECT DISTINCT location
      FROM so_lines
      WHERE so_id = ${soId}
      ORDER BY location
    `;

    return NextResponse.json({ locations: rows.map((r: any) => r.location) });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}