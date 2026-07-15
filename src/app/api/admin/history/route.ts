import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const isInstant = searchParams.get('is_instant');

    // 🔥 BUILD QUERY DENGAN TEMPLATE LITERAL
    let history;
    let totalResult;

    if (search) {
      // Jika ada search
      const searchPattern = `%${search}%`;
      if (isInstant === 'true') {
        history = await sql`
          SELECT * FROM history_logs
          WHERE (resi_number ILIKE ${searchPattern} 
            OR session_code ILIKE ${searchPattern} 
            OR transporter_name ILIKE ${searchPattern})
            AND is_instant = true
          ORDER BY handover_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        totalResult = await sql`
          SELECT COUNT(*) as total FROM history_logs
          WHERE (resi_number ILIKE ${searchPattern} 
            OR session_code ILIKE ${searchPattern} 
            OR transporter_name ILIKE ${searchPattern})
            AND is_instant = true
        `;
      } else if (isInstant === 'false') {
        history = await sql`
          SELECT * FROM history_logs
          WHERE (resi_number ILIKE ${searchPattern} 
            OR session_code ILIKE ${searchPattern} 
            OR transporter_name ILIKE ${searchPattern})
            AND is_instant = false
          ORDER BY handover_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        totalResult = await sql`
          SELECT COUNT(*) as total FROM history_logs
          WHERE (resi_number ILIKE ${searchPattern} 
            OR session_code ILIKE ${searchPattern} 
            OR transporter_name ILIKE ${searchPattern})
            AND is_instant = false
        `;
      } else {
        history = await sql`
          SELECT * FROM history_logs
          WHERE resi_number ILIKE ${searchPattern} 
            OR session_code ILIKE ${searchPattern} 
            OR transporter_name ILIKE ${searchPattern}
          ORDER BY handover_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        totalResult = await sql`
          SELECT COUNT(*) as total FROM history_logs
          WHERE resi_number ILIKE ${searchPattern} 
            OR session_code ILIKE ${searchPattern} 
            OR transporter_name ILIKE ${searchPattern}
        `;
      }
    } else {
      // Tanpa search
      if (isInstant === 'true') {
        history = await sql`
          SELECT * FROM history_logs
          WHERE is_instant = true
          ORDER BY handover_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        totalResult = await sql`
          SELECT COUNT(*) as total FROM history_logs WHERE is_instant = true
        `;
      } else if (isInstant === 'false') {
        history = await sql`
          SELECT * FROM history_logs
          WHERE is_instant = false
          ORDER BY handover_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        totalResult = await sql`
          SELECT COUNT(*) as total FROM history_logs WHERE is_instant = false
        `;
      } else {
        history = await sql`
          SELECT * FROM history_logs
          ORDER BY handover_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        totalResult = await sql`
          SELECT COUNT(*) as total FROM history_logs
        `;
      }
    }

    const total = parseInt(totalResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);

    // 🔥 STATISTIK
    const statsResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'DONE' THEN 1 END) as done,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'NOT_FOUND' THEN 1 END) as not_found,
        COUNT(CASE WHEN is_instant = true THEN 1 END) as instant,
        COUNT(CASE WHEN is_instant = false THEN 1 END) as regular
      FROM history_logs
    `;

    const stats = statsResult[0] || {
      total: 0,
      done: 0,
      cancelled: 0,
      not_found: 0,
      instant: 0,
      regular: 0
    };

    return NextResponse.json({
      success: true,
      data: history || [],
      stats: stats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch history',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}