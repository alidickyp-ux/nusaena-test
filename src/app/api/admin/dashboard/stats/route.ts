import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  requireAdmin,
  parseRange,
  addDays,
  toNum,
  tableExists,
  NO_STORE_HEADERS,
} from '@/lib/dashboard-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ASUMSI (cek kalau hasilnya aneh):
// 1. Kolom waktu bertipe TIMESTAMPTZ. Kalau TIMESTAMP biasa (tanpa zona),
//    ganti `col AT TIME ZONE 'Asia/Jakarta'` jadi `col` saja.
// 2. sorting_details punya kolom session_id -> sorting_sessions.id

// =============================================
// B2C
// =============================================
async function b2cPeriod(from: string, to: string) {
  const r = await sql`
    SELECT
      (SELECT COUNT(*) FROM sorting_sessions
        WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ) AS sessions,
      (SELECT COUNT(*) FROM handover_manifests
        WHERE (signed_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ) AS handovers,
      (SELECT COALESCE(SUM(total_packages_handed), 0) FROM handover_manifests
        WHERE (signed_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ) AS handed_packages,
      (SELECT COALESCE(SUM(total_discrepancy), 0) FROM handover_manifests
        WHERE (signed_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ) AS discrepancy,
      (SELECT COUNT(*) FROM handover_manifests
        WHERE (signed_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
          AND total_discrepancy > 0
      ) AS discrepancy_handovers,
      (SELECT COUNT(*) FROM sorting_details sd
        JOIN sorting_sessions ss ON ss.id = sd.session_id
        WHERE (ss.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ) AS packages,
      (SELECT COUNT(*) FROM sorting_details sd
        JOIN sorting_sessions ss ON ss.id = sd.session_id
        WHERE (ss.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
          AND sd.is_validated_handover = true
      ) AS validated_packages
  `;
  const n = toNum(r[0]);
  return {
    sessions: n.sessions,
    handovers: n.handovers,
    handed_packages: n.handed_packages,
    discrepancy: n.discrepancy,
    discrepancy_handovers: n.discrepancy_handovers,
    packages: n.packages,
    validated_packages: n.validated_packages,
    pending_packages: Math.max(0, n.packages - n.validated_packages),
  };
}

async function b2cSnapshot() {
  const r = await sql`
    SELECT COUNT(*) AS active_sessions FROM sorting_sessions WHERE status = 'RUNNING'
  `;
  return toNum(r[0]);
}

// =============================================
// INSTANT
// =============================================
async function instantPeriod(from: string, to: string) {
  const r = await sql`
    SELECT
      (SELECT COUNT(*) FROM instant_packages
        WHERE (putaway_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ) AS putaway,
      (SELECT COUNT(*) FROM instant_packages
        WHERE (picked_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ) AS picked
  `;
  const n = toNum(r[0]);
  return { putaway: n.putaway, picked: n.picked };
}

async function instantSnapshot() {
  const r = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'STORED') AS stored_packages,
      COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_total,
      COUNT(*) FILTER (
        WHERE status = 'STORED' AND putaway_at < NOW() - INTERVAL '24 hours'
      ) AS stored_over_24h
    FROM instant_packages
  `;
  return toNum(r[0]);
}

// =============================================
// B2B
// =============================================
async function b2bPeriod(from: string, to: string) {
  const r = await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE (putaway_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ) AS putaway_box,
      COUNT(*) FILTER (
        WHERE (loading_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ) AS loaded_box,
      COUNT(DISTINCT reference) FILTER (
        WHERE (putaway_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ) AS total_references,
      COUNT(DISTINCT vendor_name) FILTER (
        WHERE (putaway_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
          AND vendor_name IS NOT NULL
      ) AS total_vendors,
      COUNT(DISTINCT site) FILTER (
        WHERE (putaway_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ) AS total_sites,
      COALESCE(SUM(
        CASE WHEN weight ~ '^[0-9]+([.][0-9]+)?$' THEN weight::DECIMAL END
      ) FILTER (
        WHERE (putaway_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ), 0) AS total_weight,
      COALESCE(SUM(volume) FILTER (
        WHERE (putaway_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ), 0) AS total_volume
    FROM b2b_putaway
    WHERE deleted_at IS NULL
  `;
  return toNum(r[0]);
}

async function b2bSnapshot() {
  const r = await sql`
    SELECT
      COUNT(*) FILTER (WHERE loading_status = 'staging') AS staging_box,
      COUNT(*) FILTER (
        WHERE loading_status = 'staging' AND putaway_at < NOW() - INTERVAL '24 hours'
      ) AS staging_over_24h
    FROM b2b_putaway
    WHERE deleted_at IS NULL
  `;
  return toNum(r[0]);
}

// =============================================
// TREND (per hari, atau per jam kalau rentang = 1 hari)
// =============================================
type BucketRow = { bucket: string; total: number | string };

async function trendB2C(from: string, to: string, unit: string, fmt: string) {
  return (await sql`
    SELECT to_char(date_trunc(${unit}::text, signed_at AT TIME ZONE 'Asia/Jakarta'), ${fmt}::text) AS bucket,
           COALESCE(SUM(total_packages_handed), 0) AS total
    FROM handover_manifests
    WHERE (signed_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
    GROUP BY 1
  `) as BucketRow[];
}

async function trendInstant(from: string, to: string, unit: string, fmt: string) {
  return (await sql`
    SELECT to_char(date_trunc(${unit}::text, picked_at AT TIME ZONE 'Asia/Jakarta'), ${fmt}::text) AS bucket,
           COUNT(*) AS total
    FROM instant_packages
    WHERE picked_at IS NOT NULL
      AND (picked_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
    GROUP BY 1
  `) as BucketRow[];
}

async function trendB2B(from: string, to: string, unit: string, fmt: string) {
  return (await sql`
    SELECT to_char(date_trunc(${unit}::text, loading_at AT TIME ZONE 'Asia/Jakarta'), ${fmt}::text) AS bucket,
           COUNT(*) AS total
    FROM b2b_putaway
    WHERE deleted_at IS NULL
      AND loading_at IS NOT NULL
      AND (loading_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
    GROUP BY 1
  `) as BucketRow[];
}

function buildBuckets(from: string, to: string, hourly: boolean): string[] {
  if (hourly) {
    return Array.from(
      { length: 24 },
      (_, h) => `${from}T${String(h).padStart(2, '0')}`
    );
  }
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

function toMap(rows: BucketRow[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of rows) m[r.bucket] = Number(r.total) || 0;
  return m;
}

// =============================================
// DEFAULTS (kalau tabel opsional belum ada)
// =============================================
const EMPTY_INSTANT_PERIOD = { putaway: 0, picked: 0 };
const EMPTY_B2B_PERIOD = {
  putaway_box: 0,
  loaded_box: 0,
  total_references: 0,
  total_vendors: 0,
  total_sites: 0,
  total_weight: 0,
  total_volume: 0,
};

// =============================================
// GET
// =============================================
export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const parsed = parseRange(request.nextUrl.searchParams);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.message },
        { status: 400 }
      );
    }
    const { range } = parsed;
    const { from, to, prevFrom, prevTo, hourly } = range;

    const [hasInstant, hasB2B] = await Promise.all([
      tableExists('instant_packages'),
      tableExists('b2b_putaway'),
    ]);

    // ---------- B2C (wajib) ----------
    const [b2cCur, b2cPrev, b2cSnap] = await Promise.all([
      b2cPeriod(from, to),
      b2cPeriod(prevFrom, prevTo),
      b2cSnapshot(),
    ]);

    // ---------- Instant (opsional) ----------
    let instantCur = EMPTY_INSTANT_PERIOD;
    let instantPrev = EMPTY_INSTANT_PERIOD;
    let instantSnap: Record<string, number> = {
      stored_packages: 0,
      completed_total: 0,
      stored_over_24h: 0,
    };
    let instantAvailable = false;

    if (hasInstant) {
      try {
        [instantCur, instantPrev, instantSnap] = await Promise.all([
          instantPeriod(from, to),
          instantPeriod(prevFrom, prevTo),
          instantSnapshot(),
        ]);
        instantAvailable = true;
      } catch (err) {
        console.warn('⚠️ Error fetching instant stats:', err);
      }
    }

    // ---------- B2B (opsional) ----------
    let b2bCur: Record<string, number> = EMPTY_B2B_PERIOD;
    let b2bPrev: Record<string, number> = EMPTY_B2B_PERIOD;
    let b2bSnap: Record<string, number> = { staging_box: 0, staging_over_24h: 0 };
    let b2bAvailable = false;

    if (hasB2B) {
      try {
        [b2bCur, b2bPrev, b2bSnap] = await Promise.all([
          b2bPeriod(from, to),
          b2bPeriod(prevFrom, prevTo),
          b2bSnapshot(),
        ]);
        b2bAvailable = true;
      } catch (err) {
        console.warn('⚠️ Error fetching B2B stats:', err);
      }
    }

    // ---------- Trend ----------
    const unit = hourly ? 'hour' : 'day';
    const fmt = hourly ? 'YYYY-MM-DD"T"HH24' : 'YYYY-MM-DD';

    const [tB2C, tInstant, tB2B] = await Promise.all([
      trendB2C(from, to, unit, fmt).catch(() => [] as BucketRow[]),
      instantAvailable
        ? trendInstant(from, to, unit, fmt).catch(() => [] as BucketRow[])
        : Promise.resolve([] as BucketRow[]),
      b2bAvailable
        ? trendB2B(from, to, unit, fmt).catch(() => [] as BucketRow[])
        : Promise.resolve([] as BucketRow[]),
    ]);

    const mB2C = toMap(tB2C);
    const mInstant = toMap(tInstant);
    const mB2B = toMap(tB2B);

    const trend = buildBuckets(from, to, hourly).map((bucket) => ({
      bucket,
      b2c: mB2C[bucket] || 0,
      instant: mInstant[bucket] || 0,
      b2b: mB2B[bucket] || 0,
    }));

    // ---------- Alerts ----------
    const alerts: {
      key: string;
      level: 'danger' | 'warning' | 'info';
      count: number;
      message: string;
    }[] = [];

    if (b2cCur.discrepancy_handovers > 0) {
      alerts.push({
        key: 'discrepancy',
        level: 'danger',
        count: b2cCur.discrepancy_handovers,
        message: `${b2cCur.discrepancy_handovers} handover memiliki discrepancy (${b2cCur.discrepancy} paket) di periode ini`,
      });
    }
    if (b2bSnap.staging_over_24h > 0) {
      alerts.push({
        key: 'b2b_staging',
        level: 'warning',
        count: b2bSnap.staging_over_24h,
        message: `${b2bSnap.staging_over_24h} box B2B staging lebih dari 24 jam`,
      });
    }
    if (instantSnap.stored_over_24h > 0) {
      alerts.push({
        key: 'instant_stored',
        level: 'warning',
        count: instantSnap.stored_over_24h,
        message: `${instantSnap.stored_over_24h} paket instant tersimpan lebih dari 24 jam belum di-pickup`,
      });
    }
    if (b2cCur.pending_packages > 0) {
      alerts.push({
        key: 'pending_validation',
        level: 'info',
        count: b2cCur.pending_packages,
        message: `${b2cCur.pending_packages} paket B2C belum divalidasi handover di periode ini`,
      });
    }

    return NextResponse.json(
      {
        success: true,
        range,
        stats: {
          b2c: { ...b2cCur, active_sessions: b2cSnap.active_sessions },
          instant: {
            ...instantCur,
            stored_packages: instantSnap.stored_packages,
            completed_total: instantSnap.completed_total,
            is_available: instantAvailable,
          },
          b2b: {
            ...b2bCur,
            staging_box: b2bSnap.staging_box,
            is_available: b2bAvailable,
          },
        },
        previous: {
          b2c: b2cPrev,
          instant: instantPrev,
          b2b: b2bPrev,
        },
        trend,
        alerts,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}