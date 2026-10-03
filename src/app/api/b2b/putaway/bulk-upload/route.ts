// src/app/api/b2b/putaway/bulk-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_ROWS = 1000;

interface ExcelRow {
  reference?: string;
  site?: string;
  weight?: number | string;
  volume?: number | string;
  store_name?: string;
  address?: string;
  city?: string;
  province?: string;
  brand?: string;
}

interface RowError {
  row: number;
  reference?: string;
  error: string;
}

interface SuccessRow {
  row: number;
  id: string;
  reference: string;
  box_id: string;
}

// 🔥 Helper: normalize string (trim + handle null/undefined)
function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export async function POST(request: NextRequest) {
  try {
    // =============================================
    // 🔥 AUTH
    // =============================================
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

    // =============================================
    // 🔥 PARSE FILE
    // =============================================
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File tidak ditemukan' },
        { status: 400 }
      );
    }

    // Cek ekstensi
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
      return NextResponse.json(
        { success: false, message: 'Format file harus .xlsx, .xls, atau .csv' },
        { status: 400 }
      );
    }

    // Baca file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
      defval: '', // pastikan field kosong jadi string kosong, bukan undefined
    });

    if (rawData.length === 0) {
      return NextResponse.json(
        { success: false, message: 'File kosong atau tidak ada data' },
        { status: 400 }
      );
    }

    if (rawData.length > MAX_ROWS) {
      return NextResponse.json(
        {
          success: false,
          message: `Maksimal ${MAX_ROWS} baris per upload. File Anda: ${rawData.length} baris`,
        },
        { status: 400 }
      );
    }

    // =============================================
    // 🔥 VALIDASI HEADER
    // =============================================
    const headers = Object.keys(rawData[0] || {}).map((h) => h.trim());
    const requiredHeaders = ['reference', 'site'];
    const missingHeaders = requiredHeaders.filter(
      (h) => !headers.includes(h)
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Kolom wajib tidak ditemukan: ${missingHeaders.join(', ')}`,
          headers: headers,
          required: requiredHeaders,
        },
        { status: 400 }
      );
    }

    // =============================================
    // 🔥 PROSES SETIAP BARIS
    // =============================================
    const successRows: SuccessRow[] = [];
    const errors: RowError[] = [];
    const usedBoxIds = new Set<string>(); // 🔥 cek duplikat dalam file

    for (let i = 0; i < rawData.length; i++) {
      const rowNumber = i + 2; // header = baris 1
      const row = rawData[i];

      try {
        // =============================================
        // 🔥 VALIDASI REFERENCE (dengan TRIM)
        // =============================================
        const reference = normalizeString(row.reference);

        if (!reference) {
          errors.push({
            row: rowNumber,
            error: 'Reference wajib diisi',
          });
          continue;
        }

        // =============================================
        // 🔥 VALIDASI SITE (dengan TRIM)
        // =============================================
        const site = normalizeString(row.site);

        if (!site) {
          errors.push({
            row: rowNumber,
            reference,
            error: 'Site wajib diisi',
          });
          continue;
        }

        // =============================================
        // 🔥 BOX ID = REFERENCE (tanpa suffix)
        // =============================================
        const boxId = reference.slice(0, 100);
        const boxNumber = reference.slice(0, 50);

        // 🔥 Cek duplikat dalam file ini
        if (usedBoxIds.has(boxId)) {
          errors.push({
            row: rowNumber,
            reference,
            error: `Reference "${reference}" duplikat dalam file ini`,
          });
          continue;
        }
        usedBoxIds.add(boxId);

        // =============================================
        // 🔥 PARSE WEIGHT & VOLUME
        // =============================================
        let weight: string | null = null;
        let volume: number | null = null;

        if (
          row.weight !== undefined &&
          row.weight !== null &&
          row.weight !== ''
        ) {
          const w =
            typeof row.weight === 'number'
              ? row.weight
              : parseFloat(String(row.weight).trim());
          if (!isNaN(w) && w > 0) {
            weight = w.toString();
          }
        }

        if (
          row.volume !== undefined &&
          row.volume !== null &&
          row.volume !== ''
        ) {
          const v =
            typeof row.volume === 'number'
              ? row.volume
              : parseFloat(String(row.volume).trim());
          if (!isNaN(v) && v > 0) {
            volume = v;
          }
        }

        // Minimal salah satu: weight atau volume
        if (!weight && !volume) {
          errors.push({
            row: rowNumber,
            reference,
            error: 'Weight atau Volume wajib diisi (minimal salah satu)',
          });
          continue;
        }

        // =============================================
        // 🔥 AMBIL STORE DATA DARI MASTER
        // =============================================
        let storeData: any = {};
        try {
          const result = await sql`
            SELECT store_name, address, city, province
            FROM master_store
            WHERE UPPER(site) = UPPER(${site})
              AND is_active = true
            LIMIT 1
          `;
          storeData = result[0] || {};
        } catch (err) {
          console.warn('Warning: master_store query error', err);
        }

        // =============================================
        // 🔥 MERGE: Excel > master_store
        // =============================================
        const finalStoreName =
          normalizeString(row.store_name) || storeData.store_name || null;

        const finalAddress =
          normalizeString(row.address) || storeData.address || null;

        const finalCity =
          normalizeString(row.city) || storeData.city || null;

        const finalProvince =
          normalizeString(row.province) || storeData.province || null;

        const finalBrand = normalizeString(row.brand) || null;

        // =============================================
        // 🔥 INSERT
        // =============================================
        const insertResult = await sql`
          INSERT INTO b2b_putaway (
            reference,
            box_id,
            box_number,
            weight,
            volume,
            site,
            store_name,
            address,
            city,
            province,
            brand,
            putaway_by,
            loading_status
          ) VALUES (
            ${reference},
            ${boxId},
            ${boxNumber},
            ${weight},
            ${volume},
            ${site},
            ${finalStoreName},
            ${finalAddress},
            ${finalCity},
            ${finalProvince},
            ${finalBrand},
            ${userSession.sub}::UUID,
            'staging'
          )
          RETURNING id, reference, box_id
        `;

        successRows.push({
          row: rowNumber,
          id: insertResult[0].id,
          reference: insertResult[0].reference,
          box_id: insertResult[0].box_id,
        });
      } catch (error) {
        // =============================================
        // 🔥 ERROR HANDLING (termasuk duplikat DB)
        // =============================================
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        const rowRef = normalizeString(row.reference);

        if (
          errorMessage.includes('uq_b2b_putaway_box') ||
          errorMessage.includes('duplicate key')
        ) {
          errors.push({
            row: rowNumber,
            reference: rowRef || undefined,
            error: `Reference "${rowRef}" sudah ada di database`,
          });
        } else {
          errors.push({
            row: rowNumber,
            reference: rowRef || undefined,
            error: errorMessage,
          });
        }
      }
    }

    // =============================================
    // 🔥 RETURN RESPONSE
    // =============================================
    return NextResponse.json({
      success: true,
      message: `✅ ${successRows.length} berhasil, ${errors.length} gagal`,
      summary: {
        total_rows: rawData.length,
        success_count: successRows.length,
        failed_count: errors.length,
      },
      errors: errors,
      inserted: successRows,
    });
  } catch (error) {
    console.error('Error bulk upload:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to upload file',
      },
      { status: 500 }
    );
  }
}