import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    // 1. Get session from cookie
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }

    // 2. Get request body
    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      );
    }

    // 3. Check if session exists
    const sessionCheck = await sql`
      SELECT id, session_code, status 
      FROM sorting_sessions 
      WHERE id = ${session_id}::UUID
    `;

    if (sessionCheck.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Session not found' },
        { status: 404 }
      );
    }

    if (sessionCheck[0].status === 'CLOSED') {
      return NextResponse.json(
        { success: false, message: 'Session already closed' },
        { status: 400 }
      );
    }

    // 4. Close the session
    await sql`
      UPDATE sorting_sessions 
      SET 
        status = 'CLOSED', 
        closed_at = NOW()
      WHERE id = ${session_id}::UUID
    `;

    return NextResponse.json({
      success: true,
      message: 'Session closed successfully',
      session_code: sessionCheck[0].session_code,
    });

  } catch (error) {
    console.error('Error closing session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to close session' },
      { status: 500 }
    );
  }
}