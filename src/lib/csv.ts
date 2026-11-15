/** Escape satu sel CSV: beri tanda kutip kalau berisi koma, kutip, atau baris baru. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toLine(cells: unknown[]): string {
  return cells.map(csvCell).join(',') + '\r\n';
}

export interface CsvBatch<C> {
  rows: unknown[][];
  /** Cursor untuk batch berikutnya, atau null kalau data sudah habis. */
  next: C | null;
}

/**
 * Buat response CSV yang dikirim bertahap (streaming).
 * Data diambil dari database per batch, jadi tidak ada satu query raksasa dan
 * isi file tidak perlu ditampung penuh di memori server.
 *
 * Batch pertama diambil sebelum stream dimulai, sehingga kalau query gagal
 * pemanggil masih bisa membalas 500 dalam bentuk JSON.
 */
export async function createCsvResponse<C>({
  filename,
  headers,
  fetchBatch,
}: {
  filename: string;
  headers: string[];
  fetchBatch: (cursor: C | null) => Promise<CsvBatch<C>>;
}): Promise<Response> {
  const encoder = new TextEncoder();
  let batch = await fetchBatch(null);
  let started = false;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (!started) {
          started = true;
          // BOM supaya Excel membaca file sebagai UTF-8.
          controller.enqueue(encoder.encode('\uFEFF' + toLine(headers)));
        }

        if (batch.rows.length > 0) {
          controller.enqueue(encoder.encode(batch.rows.map(toLine).join('')));
        }

        if (batch.next === null) {
          controller.close();
          return;
        }

        batch = await fetchBatch(batch.next);
      } catch (error) {
        console.error('Error streaming CSV:', error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}