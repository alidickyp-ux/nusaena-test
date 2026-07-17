import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET: List semua ekspedisi
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

    const ekspedisi = await sql`
      SELECT 
        id,
        vendor_name,
        weight_price,
        volume_price,
        is_active,
        created_at,
        updated_at
      FROM master_ekspedisi
      ORDER BY vendor_name ASC
    `;

    return NextResponse.json({
      success: true,
      data: ekspedisi,
    });

  } catch (error) {
    console.error('Error fetching ekspedisi:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch ekspedisi' },
      { status: 500 }
    );
  }
}

// POST: Create new ekspedisi
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession || userSession.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { vendor_name, weight_price, volume_price } = body;

    if (!vendor_name) {
      return NextResponse.json(
        { success: false, message: 'Vendor name is required' },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await sql`
      SELECT id FROM master_ekspedisi WHERE vendor_name = ${vendor_name}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Vendor already exists' },
        { status: 409 }
      );
    }

    const result = await sql`
      INSERT INTO master_ekspedisi (vendor_name, weight_price, volume_price)
      VALUES (${vendor_name}, ${weight_price || 0}, ${volume_price || 0})
      RETURNING id, vendor_name, weight_price, volume_price, is_active
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating ekspedisi:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create ekspedisi' },
      { status: 500 }
    );
  }
}

// DELETE: Delete ekspedisi
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM master_ekspedisi WHERE id = ${id}::INTEGER
    `;

    return NextResponse.json({
      success: true,
      message: 'Ekspedisi deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting ekspedisi:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete ekspedisi' },
      { status: 500 }
    );
  }
}