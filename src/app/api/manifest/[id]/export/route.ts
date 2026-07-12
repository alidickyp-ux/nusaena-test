import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import * as XLSX from 'xlsx';

// 🔥 WAJIB: xlsx pakai Node.js API (Buffer dll), gagal kalau jalan di Edge Runtime
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const manifestId = params.id;
    if (!manifestId) {
      return NextResponse.json(
        { success: false, message: 'Manifest ID is required' },
        { status: 400 }
      );
    }

    // Ambil manifest
    const manifest = await sql`
      SELECT 
        hm.*,
        ss.session_code,
        mt.transporter_name,
        u.full_name as operator_name
      FROM handover_manifests hm
      JOIN sorting_sessions ss ON ss.id = hm.session_id
      JOIN master_transporters mt ON mt.id = ss.transporter_id
      JOIN users u ON u.id = ss.operator_id
      WHERE hm.id = ${manifestId}::UUID
    `;

    if (manifest.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Manifest not found' },
        { status: 404 }
      );
    }

    // Ambil history logs
    const historyLogs = await sql`
      SELECT 
        resi_number,
        status,
        sorting_by,
        handover_by,
        sorting_at,
        handover_at
      FROM history_logs
      WHERE session_id = ${manifest[0].session_id}::UUID
      ORDER BY 
        CASE 
          WHEN status = 'DONE' THEN 1
          WHEN status = 'CANCELLED' THEN 2
          WHEN status = 'NOT_FOUND' THEN 3
          ELSE 4
        END,
        resi_number ASC
    `;

    const workbook = XLSX.utils.book_new();

    // ===== SHEET 1: SUMMARY =====
    const totalDone = historyLogs.filter((h: any) => h.status === 'DONE').length;
    const totalCancel = historyLogs.filter((h: any) => h.status === 'CANCELLED').length;
    const totalNotFound = historyLogs.filter((h: any) => h.status === 'NOT_FOUND').length;

    const summaryData = [
      ['BUKTI SERAH TERIMA - HANDOVER MANIFEST'],
      [''],
      ['Session Code', manifest[0].session_code],
      ['Transporter', manifest[0].transporter_name],
      ['Operator', manifest[0].operator_name],
      ['Kurir', manifest[0].courier_name],
      ['Security', manifest[0].security_name],
      ['Vehicle Number', manifest[0].vehicle_number],
      ['Signed At', new Date(manifest[0].signed_at).toLocaleString('id-ID')],
      [''],
      ['REKAPITULASI'],
      ['Total Paket', historyLogs.length],
      ['Good (DONE)', totalDone],
      ['Cancel (CANCELLED)', totalCancel],
      ['Not Found (NOT_FOUND)', totalNotFound],
      ['Total Discrepancy', totalCancel + totalNotFound],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // ===== SHEET 2: DETAIL RESI =====
    const detailData = [
      ['No', 'Resi Number', 'Status', 'Sorting By', 'Handover By', 'Sorting At', 'Handover At']
    ];

    historyLogs.forEach((log: any, index: number) => {
      const statusLabel = log.status === 'DONE' ? 'Good' : 
                          log.status === 'CANCELLED' ? 'Cancel' : 
                          log.status === 'NOT_FOUND' ? 'Not Found' : log.status;
      detailData.push([
        index + 1,
        log.resi_number,
        statusLabel,
        log.sorting_by || '-',
        log.handover_by || '-',
        log.sorting_at ? new Date(log.sorting_at).toLocaleString('id-ID') : '-',
        log.handover_at ? new Date(log.handover_at).toLocaleString('id-ID') : '-',
      ]);
    });

    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
    detailSheet['!cols'] = [
      { wch: 5 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail Resi');

    // ===== SHEET 3: DISCREPANCY =====
    const discrepancyLogs = historyLogs.filter(
      (h: any) => h.status === 'CANCELLED' || h.status === 'NOT_FOUND'
    );

    if (discrepancyLogs.length > 0) {
      const discData = [
        ['No', 'Resi Number', 'Status', 'Notes']
      ];
      discrepancyLogs.forEach((log: any, index: number) => {
        discData.push([
          index + 1,
          log.resi_number,
          log.status === 'CANCELLED' ? 'Cancel' : 'Not Found',
          log.status === 'CANCELLED' ? 'Paket dibatalkan' : 'Paket tidak ditemukan'
        ]);
      });
      const discSheet = XLSX.utils.aoa_to_sheet(discData);
      discSheet['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 12 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, discSheet, 'Discrepancy');
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=manifest-${manifest[0].session_code}.xlsx`,
      },
    });

  } catch (error) {
    console.error('Error exporting manifest:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export manifest: ' + (error as Error).message },
      { status: 500 }
    );
  }
}