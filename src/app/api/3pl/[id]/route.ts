import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

// PUT: Update 3PL
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication & admin role
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = parseInt(params.id);
    const body = await request.json();
    const { transporter_name, transporter_code, is_active, notes } = body;

    const result = await sql`
      UPDATE master_3pl
      SET 
        transporter_name = COALESCE(${transporter_name}, transporter_name),
        transporter_code = COALESCE(${transporter_code}, transporter_code),
        is_active = COALESCE(${is_active}, is_active),
        notes = COALESCE(${notes}, notes)
      WHERE id = ${id}
      RETURNING id, transporter_name, transporter_code, is_active, notes
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: '3PL not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });

  } catch (error) {
    console.error('Error updating 3PL:', error);
    return NextResponse.json(
      { error: 'Failed to update 3PL' },
      { status: 500 }
    );
  }
}

// DELETE: Delete 3PL
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication & admin role
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = parseInt(params.id);

    const result = await sql`
      DELETE FROM master_3pl
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: '3PL not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '3PL deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting 3PL:', error);
    return NextResponse.json(
      { error: 'Failed to delete 3PL' },
      { status: 500 }
    );
  }
}