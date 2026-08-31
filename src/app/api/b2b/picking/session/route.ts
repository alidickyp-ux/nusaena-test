import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

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

    const body = await req.json();
    const { soId } = body;

    if (!soId) {
      return NextResponse.json({ error: 'soId wajib diisi' }, { status: 400 });
    }

    const operatorName = userSession.full_name || userSession.username || 'Unknown';

    const [result] = await sql`
      INSERT INTO picking_sessions (so_id, operator, status)
      VALUES (${soId}, ${operatorName}, 'RUNNING')
      RETURNING id
    `;

    return NextResponse.json({ sessionId: result.id });
  } catch (error) {
    console.error('Error creating picking session:', error);
    return NextResponse.json(
      { error: 'Failed to create picking session' },
      { status: 500 }
    );
  }
}