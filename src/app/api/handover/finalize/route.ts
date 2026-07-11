import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
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
    const {
      session_id,
      mode, // 'trust' or 'verify'
      courier_name,
      security_name,
      vehicle_number,
      courier_signature,
      security_signature,
      discrepancy_reasons,
    } = body;

    // Validasi
    if (!session_id || !courier_name || !security_name || !vehicle_number) {
      return NextResponse.json(
        { success: false, message: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    if (!courier_signature || !security_signature) {
      return NextResponse.json(
        { success: false, message: 'Tanda tangan wajib diisi' },
        { status: 400 }
      );
    }

    // Cek session
    const sessionCheck = await sql`
      SELECT 
        ss.id, 
        ss.status, 
        ss.session_code, 
        ss.transporter_id,
        mt.transporter_name,
        ss.created_at as session_created_at
      FROM sorting_sessions ss
      LEFT JOIN master_transporters mt ON mt.id = ss.transporter_id
      WHERE ss.id = ${session_id}::UUID
    `;

    if (sessionCheck.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Session not found' },
        { status: 404 }
      );
    }

    if (sessionCheck[0].status === 'CLOSED') {
      return NextResponse.json(
        { success: false, message: 'Session sudah ditutup' },
        { status: 400 }
      );
    }

    const sessionData = sessionCheck[0];

    // =============================================
    // MODE TRUST: Semua paket langsung DONE
    // =============================================
    if (mode === 'trust') {
      // 1. Update semua sorting_details jadi validated
      await sql`
        UPDATE sorting_details
        SET 
          is_validated_handover = true,
          validated_by = ${session.sub}::UUID,
          validated_at = NOW(),
          discrepancy_reason = NULL
        WHERE session_id = ${session_id}::UUID
      `;

      // 2. 🔥 INSERT INTO HISTORY LOGS - SEMUA DONE
      await sql`
        INSERT INTO history_logs (
          session_id,
          session_code,
          transporter_name,
          resi_number,
          sorting_at,
          sorting_by,
          handover_at,
          handover_by,
          status
        )
        SELECT 
          ${session_id}::UUID,
          ${sessionData.session_code},
          ${sessionData.transporter_name},
          sd.barcode_resi,
          sd.scanned_at,
          u.full_name,
          NOW(),
          ${courier_name},
          'DONE'
        FROM sorting_details sd
        LEFT JOIN users u ON u.id = sd.sorting_by
        WHERE sd.session_id = ${session_id}::UUID
      `;

      // 3. Hitung total paket
      const totalPackages = await sql`
        SELECT COUNT(*) as count FROM sorting_details 
        WHERE session_id = ${session_id}::UUID
      `;

      // 4. Insert manifest
      await sql`
        INSERT INTO handover_manifests (
          session_id,
          courier_name,
          security_name,
          vehicle_number,
          courier_signature,
          security_signature,
          total_packages_handed,
          total_discrepancy,
          handover_by,
          signed_at
        ) VALUES (
          ${session_id}::UUID,
          ${courier_name},
          ${security_name},
          ${vehicle_number},
          ${courier_signature},
          ${security_signature},
          ${totalPackages[0].count},
          0,
          ${session.sub}::UUID,
          NOW()
        )
      `;

      // 5. Close session
      await sql`
        UPDATE sorting_sessions 
        SET status = 'CLOSED', closed_at = NOW()
        WHERE id = ${session_id}::UUID
      `;

      return NextResponse.json({
        success: true,
        message: '✅ Handover berhasil! Semua paket DONE (Trust Mode)',
        mode: 'trust',
        total: totalPackages[0].count,
        discrepancy: 0,
      });
    }

    // =============================================
    // MODE VERIFY: Scan ulang, ada discrepancy
    // =============================================
    if (mode === 'verify') {
      // 1. Paket yang sudah discan → DONE
      await sql`
        UPDATE sorting_details
        SET 
          is_validated_handover = true,
          validated_by = ${session.sub}::UUID,
          validated_at = NOW(),
          discrepancy_reason = NULL
        WHERE session_id = ${session_id}::UUID
          AND is_validated_handover = true
      `;

      // 2. Paket yang belum discan → NOT_FOUND / CANCELLED
      if (discrepancy_reasons && Object.keys(discrepancy_reasons).length > 0) {
        for (const [barcode, reason] of Object.entries(discrepancy_reasons)) {
          await sql`
            UPDATE sorting_details
            SET 
              is_validated_handover = true,
              validated_by = ${session.sub}::UUID,
              validated_at = NOW(),
              discrepancy_reason = ${reason}::VARCHAR
            WHERE session_id = ${session_id}::UUID
              AND barcode_resi = ${barcode}
          `;
        }
      }

      // 3. 🔥 INSERT INTO HISTORY LOGS - DONE, NOT_FOUND, CANCELLED
      await sql`
        INSERT INTO history_logs (
          session_id,
          session_code,
          transporter_name,
          resi_number,
          sorting_at,
          sorting_by,
          handover_at,
          handover_by,
          status
        )
        SELECT 
          ${session_id}::UUID,
          ${sessionData.session_code},
          ${sessionData.transporter_name},
          sd.barcode_resi,
          sd.scanned_at,
          u.full_name,
          NOW(),
          ${courier_name},
          CASE 
            WHEN sd.discrepancy_reason IS NULL THEN 'DONE'
            ELSE sd.discrepancy_reason
          END
        FROM sorting_details sd
        LEFT JOIN users u ON u.id = sd.sorting_by
        WHERE sd.session_id = ${session_id}::UUID
      `;

      // 4. Hitung stats
      const stats = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN discrepancy_reason IS NULL THEN 1 END) as done,
          COUNT(CASE WHEN discrepancy_reason = 'NOT_FOUND' THEN 1 END) as not_found,
          COUNT(CASE WHEN discrepancy_reason = 'CANCELLED' THEN 1 END) as cancelled
        FROM sorting_details
        WHERE session_id = ${session_id}::UUID
      `;

      const totalDiscrepancy = Number(stats[0].not_found) + Number(stats[0].cancelled);

      // 5. Insert manifest dengan discrepancy
      await sql`
        INSERT INTO handover_manifests (
          session_id,
          courier_name,
          security_name,
          vehicle_number,
          courier_signature,
          security_signature,
          total_packages_handed,
          total_discrepancy,
          handover_by,
          signed_at
        ) VALUES (
          ${session_id}::UUID,
          ${courier_name},
          ${security_name},
          ${vehicle_number},
          ${courier_signature},
          ${security_signature},
          ${stats[0].total},
          ${totalDiscrepancy},
          ${session.sub}::UUID,
          NOW()
        )
      `;

      // 6. Close session
      await sql`
        UPDATE sorting_sessions 
        SET status = 'CLOSED', closed_at = NOW()
        WHERE id = ${session_id}::UUID
      `;

      return NextResponse.json({
        success: true,
        message: `✅ Handover selesai! ${stats[0].done} DONE, ${totalDiscrepancy} DISCREPANCY`,
        mode: 'verify',
        total: stats[0].total,
        done: stats[0].done,
        not_found: stats[0].not_found,
        cancelled: stats[0].cancelled,
        discrepancy: totalDiscrepancy,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid mode' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error finalizing handover:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to finalize handover' },
      { status: 500 }
    );
  }
}