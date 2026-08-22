import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userSession = await verifySession(sessionToken);
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sessionStatus = searchParams.get('session_status') || 'all';

    // Query dasar
    let query = `
      SELECT 
        ss.session_code,
        sd.barcode_resi,
        mt.transporter_name,
        sd.scanned_at,
        sd.is_validated_handover,
        sd.discrepancy_reason,
        sd.validated_at,
        u.full_name as sorting_by_name
      FROM sorting_details sd
      JOIN sorting_sessions ss ON ss.id = sd.session_id
      LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
      LEFT JOIN users u ON u.id = sd.sorting_by
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Filter search (gunakan satu placeholder untuk tiga kolom)
    if (search) {
      const searchPattern = `%${search}%`;
      query += ` AND (sd.barcode_resi ILIKE $${paramIndex} OR ss.session_code ILIKE $${paramIndex} OR mt.transporter_name ILIKE $${paramIndex})`;
      params.push(searchPattern);
      paramIndex++;
    }

    // Filter status session
    if (sessionStatus === 'running') {
      query += ` AND ss.status = $${paramIndex}`;
      params.push('RUNNING');
      paramIndex++;
    } else if (sessionStatus === 'closed') {
      query += ` AND ss.status = $${paramIndex}`;
      params.push('CLOSED');
      paramIndex++;
    }

    query += ` ORDER BY sd.scanned_at DESC`;

    // Eksekusi query — panggil sql sebagai function, BUKAN sql.query(...)
    const rows = await sql(query, params);

    // Format CSV
    const headers = [
      'Session Code',
      'Resi Number',
      'Transporter',
      'Scanned At',
      'Handover Status',
      'Discrepancy Reason',
      'Validated At',
      'Sorting By'
    ];

    // Bungkus tiap field dalam tanda kutip agar koma di dalam value
    // (mis. hasil toLocaleString "22/8/2026, 17.51.20") tidak dianggap
    // sebagai pemisah kolom oleh Excel.
    const escapeCsvField = (value: unknown) => {
      const str = String(value ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvRows = rows.map((r: any) => [
      r.session_code || '',
      r.barcode_resi || '',
      r.transporter_name || '',
      new Date(r.scanned_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      r.is_validated_handover ? 'Sudah' : 'Belum',
      r.discrepancy_reason || '-',
      r.validated_at ? new Date(r.validated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-',
      r.sorting_by_name || '-'
    ]);

    const csvContent = [
      headers.map(escapeCsvField).join(','),
      ...csvRows.map((row: string[]) => row.map(escapeCsvField).join(','))
    ].join('\n');

    // Tambahkan BOM agar karakter khusus tampil benar di Excel Windows
    return new NextResponse('\ufeff' + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=sorting-details-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  } catch (error) {
    console.error('Error exporting sorting details:', error);
    return NextResponse.json(
      { error: 'Failed to export' },
      { status: 500 }
    );
  }
}