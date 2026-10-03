// src/app/api/b2b/putaway/template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // =============================================
    // 🔥 SHEET 1: TEMPLATE
    // =============================================
    const templateData = [
      // Header — 9 kolom
      [
        'reference',
        'site',
        'store_name',
        'address',
        'city',
        'province',
        'weight',
        'volume',
        'brand',
      ],

      // Contoh data
      [
        'SKR001',
        'ST00010',
        'SUMATERA',
        'JL. SUMATERA NO. 10',
        'BANDUNG',
        'JAWA BARAT',
        15.6,
        0.5,
        'Samsung',
      ],
      [
        'SKR001',
        'ST00010',
        'SUMATERA',
        'JL. SUMATERA NO. 10',
        'BANDUNG',
        'JAWA BARAT',
        12.3,
        0.4,
        'Samsung',
      ],
      [
        'SKR001',
        'ST00010',
        'SUMATERA',
        'JL. SUMATERA NO. 10',
        'BANDUNG',
        'JAWA BARAT',
        8.5,
        0.3,
        'Xiaomi',
      ],
      [
        'SKR002',
        'ST00011',
        'JAWA',
        'JL. JAWA NO. 22',
        'SURABAYA',
        'JAWA TIMUR',
        20.0,
        0.8,
        'Apple',
      ],
      [
        'SKR002',
        'ST00011',
        'JAWA',
        'JL. JAWA NO. 22',
        'SURABAYA',
        'JAWA TIMUR',
        18.5,
        0.7,
        'Apple',
      ],
    ];

    const templateSheet = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    templateSheet['!cols'] = [
      { wch: 15 }, // reference
      { wch: 12 }, // site
      { wch: 20 }, // store_name
      { wch: 30 }, // address
      { wch: 15 }, // city
      { wch: 18 }, // province
      { wch: 10 }, // weight
      { wch: 10 }, // volume
      { wch: 15 }, // brand
    ];

    // =============================================
    // 🔥 SHEET 2: PETUNJUK
    // =============================================
    const petunjukData = [
      ['PETUNJUK PENGGUNAAN TEMPLATE PUTAWAY B2B'],
      [''],
      ['1. KOLOM WAJIB DIISI:'],
      ['   - reference : Kode pengiriman (PO/Reference dari vendor)'],
      ['   - site      : Kode site (contoh: ST00010)'],
      [''],
      ['2. KOLOM OPSIONAL:'],
      ['   - store_name : Nama toko (auto-fill dari master_store jika kosong)'],
      ['   - address    : Alamat lengkap (auto-fill dari master_store jika kosong)'],
      ['   - city       : Kota (auto-fill dari master_store jika kosong)'],
      ['   - province   : Provinsi (auto-fill dari master_store jika kosong)'],
      ['   - weight     : Berat box dalam kg (isi salah satu: weight atau volume)'],
      ['   - volume     : Volume box dalam m³ (isi salah satu: weight atau volume)'],
      ['   - brand      : Brand produk'],
      [''],
      ['3. ATURAN:'],
      ['   - 1 reference = 1 pengiriman = banyak box'],
      ['   - Reference BOLEH diulang untuk box yang berbeda'],
      ['   - Box ID akan di-generate otomatis dengan format: {reference}-{nomor urut}'],
      ['   - Box Number akan sama dengan reference'],
      ['   - Minimal salah satu dari weight atau volume wajib diisi'],
      [''],
      ['4. CONTOH:'],
      [
        '   reference | site    | store_name | address            | city     | province   | weight | volume | brand',
      ],
      [
        '   SKR001    | ST00010 | SUMATERA   | JL. SUMATERA NO.10 | BANDUNG  | JAWA BARAT | 15.6   | 0.5    | Samsung',
      ],
      [
        '   SKR001    | ST00010 | SUMATERA   | JL. SUMATERA NO.10 | BANDUNG  | JAWA BARAT | 12.3   | 0.4    | Samsung',
      ],
      [
        '   SKR001    | ST00010 | SUMATERA   | JL. SUMATERA NO.10 | BANDUNG  | JAWA BARAT | 8.5    | 0.3    | Xiaomi',
      ],
      [''],
      ['5. SETELAH UPLOAD:'],
      ['   - Data akan masuk dengan status "staging"'],
      ['   - Jika ada error di baris tertentu, baris itu akan di-skip'],
      ['   - Notifikasi error akan muncul di pop-up'],
      [''],
      ['6. CATATAN:'],
      ['   - Maksimal 1000 baris per upload'],
      ['   - Format file: .xlsx atau .xls atau .csv'],
      ['   - Jangan mengubah nama header (baris pertama)'],
      ['   - Jika site terdaftar di master_store, data store/address/city/province akan auto-fill'],
      ['   - Jika kolom store diisi manual, nilai Excel yang dipakai (override master)'],
    ];

    const petunjukSheet = XLSX.utils.aoa_to_sheet(petunjukData);
    petunjukSheet['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 20 },
      { wch: 15 },
    ];

    // =============================================
    // 🔥 BUILD WORKBOOK
    // =============================================
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Template');
    XLSX.utils.book_append_sheet(workbook, petunjukSheet, 'Petunjuk');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Format nama file dengan tanggal
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `template-putaway-b2b-${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate template' },
      { status: 500 }
    );
  }
}