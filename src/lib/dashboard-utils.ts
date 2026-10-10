import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const MAX_RANGE_DAYS = 366;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// =============================================
// AUTH
// =============================================
// Return null kalau lolos, atau NextResponse error kalau gagal
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userSession = await verifySession(sessionToken);
  if (!userSession || userSession.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  }
  return null;
}

// =============================================
// DATE HELPERS (semua dalam format YYYY-MM-DD, zona Asia/Jakarta)
// =============================================
export function jakartaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
    new Date()
  );
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000
  );
}

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export type DateRange = {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  days: number;
  hourly: boolean;
};

export function parseRange(
  sp: URLSearchParams
): { ok: true; range: DateRange } | { ok: false; message: string } {
  const today = jakartaToday();
  let from = sp.get('from') || today;
  let to = sp.get('to') || from;

  if (!isValidDate(from) || !isValidDate(to)) {
    return { ok: false, message: 'Format tanggal harus YYYY-MM-DD' };
  }
  if (from > to) [from, to] = [to, from];

  const days = diffDays(from, to) + 1;
  if (days > MAX_RANGE_DAYS) {
    return { ok: false, message: `Rentang maksimal ${MAX_RANGE_DAYS} hari` };
  }

  return {
    ok: true,
    range: {
      from,
      to,
      prevFrom: addDays(from, -days),
      prevTo: addDays(from, -1),
      days,
      hourly: days === 1,
    },
  };
}

// =============================================
// DB HELPERS
// =============================================
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${tableName}
      ) as exists
    `;
    return result[0]?.exists || false;
  } catch {
    return false;
  }
}

// COUNT/SUM dari Postgres sering balik sebagai string (bigint/numeric).
// Fungsi ini ubah semua value jadi number.
export function toNum(row: Record<string, unknown> | undefined | null) {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(row ?? {})) {
    out[k] = Number(v) || 0;
  }
  return out;
}