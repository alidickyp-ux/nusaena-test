import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    // 🔥 Hanya kolom minimal — dipakai untuk tombol print di tab DN Header,
    // terpisah dari daftar ter-paginasi di tab "Semua Reference"
    const rows = await sql`
      SELECT mr.id, mr.reference, mo.delivery_number
      FROM manifest_reference mr
      INNER JOIN manifest_order mo ON mo.id = mr.manifest_id
      ORDER BY mo.delivery_number ASC, mr.reference ASC
    `;

    return NextResponse.json({ success: true, data: rows });

  } catch (error) {
    console.error('Error fetching references by manifest:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch' },
      { status: 500 }
    );
  }
}