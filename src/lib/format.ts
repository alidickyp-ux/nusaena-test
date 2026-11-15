export const APP_TZ = "Asia/Jakarta";

/** "15 Nov 2026, 14.30" dalam zona waktu Jakarta (bukan zona browser). */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    timeZone: APP_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString("id-ID", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Tanggal YYYY-MM-DD menurut zona waktu Jakarta. */
export function toDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(d);
}

/** Geser tanggal YYYY-MM-DD sebanyak `days` hari. */
export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** Bangun query string; nilai kosong / null / undefined dilewati. */
export function buildQuery(params: QueryParams): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  return sp.toString();
}