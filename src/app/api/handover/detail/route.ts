import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/handover/detail?sessionId=xxx
// Ambil info sesi + daftar semua resi (matched maupun belum) untuk sesi tsb.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId wajib diisi' }, { status: 400 });
  }

  const sessionRows = await sql`
    SELECT ss.id, ss.session_code, ss.status, mt.transporter_name
    FROM sorting_sessions ss
    JOIN master_transporters mt ON mt.id = ss.transporter_id
    WHERE ss.id = ${sessionId}
  `;

  if (sessionRows.length === 0) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
  }

  const items = await sql`
    SELECT id, barcode_resi, is_validated_handover
    FROM sorting_details
    WHERE session_id = ${sessionId}
    ORDER BY scanned_at ASC
  `;

  return NextResponse.json({ session: sessionRows[0], items });
}
