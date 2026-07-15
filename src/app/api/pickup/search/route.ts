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
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const mode = searchParams.get('mode') || 'search'; // 'search' or 'suggest'

    // 🔥 MODE SUGGEST: Auto-complete / Rekomendasi
    if (mode === 'suggest' && query.length >= 2) {
      const suggestions = await sql`
        SELECT 
          ip.barcode_resi,
          ip.location_code,
          ip.status,
          ip.putaway_at,
          u.full_name as putaway_by_name,
          ss.session_code,
          mt.transporter_name
        FROM public.instant_packages ip
        JOIN public.sorting_sessions ss ON ss.id = ip.session_id
        JOIN public.master_transporters mt ON mt.id = ip.transporter_id
        LEFT JOIN public.users u ON u.id = ip.putaway_by
        WHERE ip.status = 'STORED'
          AND ip.barcode_resi ILIKE ${'%' + query + '%'}
        ORDER BY ip.putaway_at DESC
        LIMIT 10
      `;

      return NextResponse.json({
        success: true,
        mode: 'suggest',
        data: suggestions,
        total: suggestions.length,
      });
    }

    // 🔥 MODE SEARCH: Cari exact match
    if (!query) {
      return NextResponse.json(
        { success: false, message: 'Query is required' },
        { status: 400 }
      );
    }

    // Cari paket di instant_packages
    const result = await sql`
      SELECT 
        ip.barcode_resi,
        ip.location_code,
        ip.status,
        ip.putaway_at,
        u1.full_name as putaway_by_name,
        ip.picked_at,
        u2.full_name as picked_by_name,
        ss.session_code,
        mt.transporter_name
      FROM public.instant_packages ip
      JOIN public.sorting_sessions ss ON ss.id = ip.session_id
      JOIN public.master_transporters mt ON mt.id = ip.transporter_id
      LEFT JOIN public.users u1 ON u1.id = ip.putaway_by
      LEFT JOIN public.users u2 ON u2.id = ip.picked_by
      WHERE ip.barcode_resi = ${query}
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Paket tidak ditemukan',
        mode: 'search',
      });
    }

    const packageData = result[0];

    // Cek apakah sudah di-pickup
    if (packageData.status === 'PICKED' || packageData.status === 'COMPLETED') {
      return NextResponse.json({
        success: false,
        message: `Paket sudah diambil pada ${new Date(packageData.picked_at).toLocaleString('id-ID')}`,
        mode: 'search',
        data: packageData,
      });
    }

    return NextResponse.json({
      success: true,
      mode: 'search',
      data: packageData,
    });

  } catch (error) {
    console.error('Error searching package:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to search package' },
      { status: 500 }
    );
  }
}