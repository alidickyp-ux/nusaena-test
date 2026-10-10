import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// =============================================
// BUCKETS
// - 06..22 : per jam (17 kolom)
// - 23     : sentinel untuk bucket ">23" = jam 23 + 00 + 01 + 02 + 03 + 04 + 05
// =============================================
const DISPLAY_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const LATE_BUCKET = 23;
const HOURS: number[] = [...DISPLAY_HOURS, LATE_BUCKET];

const ROW_META = [
  { key: "b2c_sorting", label: "B2C Sorting", color: "#E87A2A" },
  { key: "b2c_handover", label: "B2C Handover", color: "#1a7a5a" },
  { key: "b2b_putaway", label: "B2B Putaway", color: "#6d28d9" },
  { key: "b2b_loading", label: "B2B Loading", color: "#0891b2" },
] as const;

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userSession = await verifySession(sessionToken);
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: "Invalid session" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { success: false, message: "Parameter from & to wajib" },
        { status: 400 }
      );
    }

    // Query paralel: 4 sumber data
    // Bucket: jam 6-22 individual, sisanya (23, 0-5) masuk bucket 23
    const [sortingRows, handoverRows, putawayRows, loadingRows] =
      await Promise.all([
        // 1. B2C Sorting — sorting_details.scanned_at
        sql`
          SELECT
            CASE
              WHEN EXTRACT(HOUR FROM scanned_at AT TIME ZONE 'Asia/Jakarta')::int BETWEEN 6 AND 22
                THEN EXTRACT(HOUR FROM scanned_at AT TIME ZONE 'Asia/Jakarta')::int
              ELSE 23
            END AS hour,
            COUNT(*)::int AS count
          FROM sorting_details
          WHERE scanned_at AT TIME ZONE 'Asia/Jakarta'
                  >= (${from}::date + INTERVAL '6 hours')
            AND scanned_at AT TIME ZONE 'Asia/Jakarta'
                  < (${to}::date + INTERVAL '1 day 6 hours')
          GROUP BY 1
        `,

        // 2. B2C Handover — sorting_details.validated_at
        sql`
          SELECT
            CASE
              WHEN EXTRACT(HOUR FROM validated_at AT TIME ZONE 'Asia/Jakarta')::int BETWEEN 6 AND 22
                THEN EXTRACT(HOUR FROM validated_at AT TIME ZONE 'Asia/Jakarta')::int
              ELSE 23
            END AS hour,
            COUNT(*)::int AS count
          FROM sorting_details
          WHERE validated_at IS NOT NULL
            AND validated_at AT TIME ZONE 'Asia/Jakarta'
                  >= (${from}::date + INTERVAL '6 hours')
            AND validated_at AT TIME ZONE 'Asia/Jakarta'
                  < (${to}::date + INTERVAL '1 day 6 hours')
          GROUP BY 1
        `,

        // 3. B2B Putaway — b2b_putaway.putaway_at
        sql`
          SELECT
            CASE
              WHEN EXTRACT(HOUR FROM putaway_at AT TIME ZONE 'Asia/Jakarta')::int BETWEEN 6 AND 22
                THEN EXTRACT(HOUR FROM putaway_at AT TIME ZONE 'Asia/Jakarta')::int
              ELSE 23
            END AS hour,
            COUNT(*)::int AS count
          FROM b2b_putaway
          WHERE putaway_at IS NOT NULL
            AND deleted_at IS NULL
            AND putaway_at AT TIME ZONE 'Asia/Jakarta'
                  >= (${from}::date + INTERVAL '6 hours')
            AND putaway_at AT TIME ZONE 'Asia/Jakarta'
                  < (${to}::date + INTERVAL '1 day 6 hours')
          GROUP BY 1
        `,

        // 4. B2B Loading — b2b_putaway.loading_at
        sql`
          SELECT
            CASE
              WHEN EXTRACT(HOUR FROM loading_at AT TIME ZONE 'Asia/Jakarta')::int BETWEEN 6 AND 22
                THEN EXTRACT(HOUR FROM loading_at AT TIME ZONE 'Asia/Jakarta')::int
              ELSE 23
            END AS hour,
            COUNT(*)::int AS count
          FROM b2b_putaway
          WHERE loading_at IS NOT NULL
            AND deleted_at IS NULL
            AND loading_at AT TIME ZONE 'Asia/Jakarta'
                  >= (${from}::date + INTERVAL '6 hours')
            AND loading_at AT TIME ZONE 'Asia/Jakarta'
                  < (${to}::date + INTERVAL '1 day 6 hours')
          GROUP BY 1
        `,
      ]);

    // Helper: map rows DB ke array sesuai HOURS (18 nilai)
    const toValues = (rows: any[]): number[] => {
      const map = new Map<number, number>();
      for (const r of rows) map.set(Number(r.hour), Number(r.count));
      return HOURS.map((h) => map.get(h) ?? 0);
    };

    const valuesMap = {
      b2c_sorting: toValues(sortingRows),
      b2c_handover: toValues(handoverRows),
      b2b_putaway: toValues(putawayRows),
      b2b_loading: toValues(loadingRows),
    };

    const rows = ROW_META.map((meta) => {
      const values = valuesMap[meta.key];
      return {
        ...meta,
        values,
        total: values.reduce((a, b) => a + b, 0),
        max: Math.max(...values, 0),
      };
    });

    // Ringkasan
    const totalPerHour = HOURS.map((_, i) =>
      rows.reduce((sum, r) => sum + r.values[i], 0)
    );
    const totalScan = totalPerHour.reduce((a, b) => a + b, 0);
    const busiestIdx = totalPerHour.indexOf(Math.max(...totalPerHour));
    const busiestHour = HOURS[busiestIdx] ?? null;
    const busiestCount = totalPerHour[busiestIdx] ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        hours: HOURS,
        rows,
        summary: {
          total_scan: totalScan,
          busiest_hour: busiestHour,
          busiest_count: busiestCount,
          average_per_hour:
            totalScan > 0 ? Math.round(totalScan / HOURS.length) : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching scan activity:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch scan activity",
      },
      { status: 500 }
    );
  }
}