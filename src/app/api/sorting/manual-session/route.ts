import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get session from cookie
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { transporter_id, operator_id } = body;

    // Validasi input
    if (!transporter_id) {
      return NextResponse.json(
        { success: false, message: 'Transporter ID is required' },
        { status: 400 }
      );
    }

    // 1. Cek apakah transporter ada di master_3pl
    const transporterCheck = await sql`
      SELECT id, transporter_name 
      FROM master_3pl 
      WHERE id = ${transporter_id} AND is_active = true
    `;

    if (transporterCheck.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Transporter tidak ditemukan atau tidak aktif' 
        },
        { status: 404 }
      );
    }

    const transporterName = transporterCheck[0].transporter_name;

    // 2. Cari transporter_id di master_transporters (untuk validasi)
    const transporterMap = await sql`
      SELECT id FROM master_transporters 
      WHERE transporter_name = ${transporterName} 
      LIMIT 1
    `;

    // Jika tidak ada di master_transporters, gunakan ID dari master_3pl
    // atau buat mapping khusus
    const actualTransporterId = transporterMap.length > 0 
      ? transporterMap[0].id 
      : transporter_id;

    // 3. Panggil fungsi create_manual_session
    const result = await sql`
      SELECT create_manual_session(
        ${actualTransporterId}::INTEGER, 
        ${operator_id || session.sub}::UUID
      ) AS result
    `;

    const resultData = result[0]?.result;

    // Parse result jika JSON string
    let parsedResult;
    if (typeof resultData === 'string') {
      try {
        parsedResult = JSON.parse(resultData);
      } catch {
        parsedResult = { success: false, message: resultData };
      }
    } else {
      parsedResult = resultData;
    }

    // Jika sukses, tambahkan informasi dari master_3pl
    if (parsedResult?.success) {
      parsedResult.transporter_name = transporterName;
      parsedResult.from_3pl = true;
    }

    return NextResponse.json(parsedResult);

  } catch (error) {
    console.error('Error creating manual session:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create manual session' 
      },
      { status: 500 }
    );
  }
}