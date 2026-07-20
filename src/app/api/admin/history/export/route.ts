import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HistoryRow {
  session_code: string;
  transporter_name: string;
  resi_number: string;
  status: string;
  is_instant: boolean;
  location_code: string | null;
  handover_by: string | null;
  handover_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filterInstant = searchParams.get('is_instant');
    const search = searchParams.get('search') || '';

    let rows: HistoryRow[] = [];

    if (search) {
      const p = `%${search}%`;
      
      if (filterInstant === 'true') {
        rows = await sql`
          SELECT 
            session_code,
            transporter_name,
            resi_number,
            status,
            is_instant,
            location_code,
            handover_by,
            handover_at
          FROM history_logs
          WHERE is_instant = true
            AND (resi_number ILIKE ${p} OR session_code ILIKE ${p} OR transporter_name ILIKE ${p})
          ORDER BY handover_at DESC
        `;
      } else if (filterInstant === 'false') {
        rows = await sql`
          SELECT 
            session_code,
            transporter_name,
            resi_number,
            status,
            is_instant,
            location_code,
            handover_by,
            handover_at
          FROM history_logs
          WHERE is_instant = false
            AND (resi_number ILIKE ${p} OR session_code ILIKE ${p} OR transporter_name ILIKE ${p})
          ORDER BY handover_at DESC
        `;
      } else {
        rows = await sql`
          SELECT 
            session_code,
            transporter_name,
            resi_number,
            status,
            is_instant,
            location_code,
            handover_by,
            handover_at
          FROM history_logs
          WHERE resi_number ILIKE ${p} OR session_code ILIKE ${p} OR transporter_name ILIKE ${p}
          ORDER BY handover_at DESC
        `;
      }
    } else {
      if (filterInstant === 'true') {
        rows = await sql`
          SELECT 
            session_code,
            transporter_name,
            resi_number,
            status,
            is_instant,
            location_code,
            handover_by,
            handover_at
          FROM history_logs
          WHERE is_instant = true
          ORDER BY handover_at DESC
        `;
      } else if (filterInstant === 'false') {
        rows = await sql`
          SELECT 
            session_code,
            transporter_name,
            resi_number,
            status,
            is_instant,
            location_code,
            handover_by,
            handover_at
          FROM history_logs
          WHERE is_instant = false
          ORDER BY handover_at DESC
        `;
      } else {
        rows = await sql`
          SELECT 
            session_code,
            transporter_name,
            resi_number,
            status,
            is_instant,
            location_code,
            handover_by,
            handover_at
          FROM history_logs
          ORDER BY handover_at DESC
        `;
      }
    }

    // Konversi ke format CSV
    const headers = [
      'Session Code',
      'Transporter',
      'Resi Number',
      'Status',
      'Type',
      'Location',
      'Handover By',
      'Handover At'
    ];

    // 🔥 Perbaikan: tambahkan tipe untuk parameter 'r'
    const csvRows = rows.map((r: HistoryRow) => [
      r.session_code || '',
      r.transporter_name || '',
      r.resi_number || '',
      r.status || '',
      r.is_instant ? 'INSTANT' : 'REGULAR',
      r.location_code || '-',
      r.handover_by || '-',
      new Date(r.handover_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map((r: string[]) => r.join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=history-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });

  } catch (error) {
    console.error('Error exporting history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export history' },
      { status: 500 }
    );
  }
}