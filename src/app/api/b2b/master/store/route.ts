import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET: List semua store
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

    const stores = await sql`
      SELECT 
        id,
        site,
        store_name,
        address,
        city,
        province,
        is_active,
        created_at,
        updated_at
      FROM master_store
      ORDER BY store_name ASC
    `;

    return NextResponse.json({
      success: true,
      data: stores,
    });

  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}

// POST: Create new store
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
    const { site, store_name, address, city, province } = body;

    if (!site || !store_name) {
      return NextResponse.json(
        { success: false, message: 'Site and store name are required' },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await sql`
      SELECT id FROM master_store WHERE site = ${site}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Site already exists' },
        { status: 409 }
      );
    }

    const result = await sql`
      INSERT INTO master_store (site, store_name, address, city, province)
      VALUES (${site}, ${store_name}, ${address || null}, ${city || null}, ${province || null})
      RETURNING id, site, store_name, address, city, province, is_active
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating store:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create store' },
      { status: 500 }
    );
  }
}

// DELETE: Delete store
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
      DELETE FROM master_store WHERE id = ${id}::INTEGER
    `;

    return NextResponse.json({
      success: true,
      message: 'Store deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting store:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete store' },
      { status: 500 }
    );
  }
}