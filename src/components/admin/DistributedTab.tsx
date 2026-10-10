"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Clock, TrendingUp, AlertCircle, Zap } from "lucide-react";

// =============================================
// TYPES
// =============================================
type Preset = "today" | "yesterday" | "7d" | "30d" | "custom";

interface ScanRow {
  key: string;
  label: string;
  color: string;
  values: number[];
  total: number;
  max: number;
}

interface ScanSummary {
  total_scan: number;
  busiest_hour: number | null;
  busiest_count: number;
  average_per_hour: number;
}

interface ScanData {
  hours: number[];
  rows: ScanRow[];
  summary: ScanSummary;
}

// =============================================
// DATE HELPERS
// =============================================
const todayStr = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date()
  );

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function presetRange(p: Exclude<Preset, "custom">) {
  const today = todayStr();
  switch (p) {
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    default:
      return { from: today, to: today };
  }
}

const PRESETS: { key: Exclude<Preset, "custom">; label: string }[] = [
  { key: "today", label: "Hari ini" },
  { key: "yesterday", label: "Kemarin" },
  { key: "7d", label: "7 hari" },
  { key: "30d", label: "30 hari" },
];

const fmtDay = (d: string, withYear = false) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });


  // Label jam: 23 adalah sentinel untuk bucket ">23"
const fmtHourLabel = (h: number) =>
  h === 23 ? ">23" : String(h).padStart(2, "0");

const fmtHourFull = (h: number) =>
  h === 23 ? "≥ 23:00 (sd 05:59)" : `${String(h).padStart(2, "0")}:00`;

// =============================================
// COLOR HELPERS
// =============================================
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function DistributedTab() {
  const [preset, setPreset] = useState<Preset>("today");
  const [range, setRange] = useState(() => presetRange("today"));
  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setUpdating(true);
      try {
        const qs = new URLSearchParams({
          from: range.from,
          to: range.to,
        });
        const res = await fetch(
          `/api/admin/dashboard/scan-activity?${qs}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (res.ok && json.success) {
          setData(json.data);
          setError(null);
        } else {
          setError(json.message || "Gagal memuat data");
        }
      } catch (err) {
        console.error(err);
        setError("Gagal terhubung ke server");
      } finally {
        setLoading(false);
        setUpdating(false);
      }
    },
    [range.from, range.to]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePreset = (p: Exclude<Preset, "custom">) => {
    setPreset(p);
    setRange(presetRange(p));
  };

  const handleCustom = (key: "from" | "to", value: string) => {
    if (!value) return;
    setPreset("custom");
    setRange((prev) => {
      const next = { ...prev, [key]: value };
      if (next.from > next.to) {
        if (key === "from") next.to = next.from;
        else next.from = next.to;
      }
      return next;
    });
  };

  const rangeLabel =
    range.from === range.to
      ? fmtDay(range.from, true)
      : `${fmtDay(range.from)} – ${fmtDay(range.to, true)}`;

  // =============================================
  // LOADING
  // =============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0B2B4A] rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm mt-3">
            Memuat distribusi scan...
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-slate-700 text-sm mt-3">
            {error || "Data tidak tersedia"}
          </p>
        </div>
      </div>
    );
  }

  const { hours, rows, summary } = data;
  const overallMax = Math.max(1, ...rows.flatMap((r) => r.values));

  return (
    <div className={`space-y-6 transition-opacity ${updating ? "opacity-60" : ""}`}>
      {/* ============================================= */}
      {/* TOOLBAR                                        */}
      {/* ============================================= */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-slate-200/70 p-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                preset === p.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="date"
            value={range.from}
            max={todayStr()}
            onChange={(e) => handleCustom("from", e.target.value)}
            className="text-xs text-slate-700 bg-transparent focus:outline-none w-[112px]"
          />
          <span className="text-xs text-slate-400">→</span>
          <input
            type="date"
            value={range.to}
            max={todayStr()}
            onChange={(e) => handleCustom("to", e.target.value)}
            className="text-xs text-slate-700 bg-transparent focus:outline-none w-[112px]"
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-400 -mt-4">{rangeLabel}</p>

      {/* ============================================= */}
      {/* SUMMARY CARDS                                  */}
      {/* ============================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={TrendingUp}
          label="Total Scan"
          value={summary.total_scan.toLocaleString("id-ID")}
          accent="navy"
        />
        <SummaryCard
          icon={Clock}
          label="Jam Tersibuk"
          value={
              summary.busiest_hour !== null
                ? summary.busiest_hour === 23
                  ? "≥ 23:00"
                  : `${String(summary.busiest_hour).padStart(2, "0")}:00`
                : "-"
            }
          sub={`${summary.busiest_count.toLocaleString("id-ID")} scan`}
          accent="orange"
        />
        <SummaryCard
          icon={Zap}
          label="Rata-rata / Jam"
          value={summary.average_per_hour.toLocaleString("id-ID")}
          accent="violet"
        />
        <SummaryCard
          icon={Calendar}
          label="Periode"
          value={
            range.from === range.to
              ? "1 hari"
              : `${Math.round(
                  (new Date(range.to).getTime() -
                    new Date(range.from).getTime()) /
                    (1000 * 60 * 60 * 24) +
                    1
                )} hari`
          }
          accent="green"
        />
      </div>

      {/* ============================================= */}
      {/* HEATMAP                                        */}
      {/* ============================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Heatmap Distribusi Scan per Jam
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Jam 06:00–22:00 detail · 23:00–05:59 digabung di kolom &gt;23
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 min-w-[900px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 w-[140px] text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-2">
                  Flow
                </th>
                {hours.map((h) => (
                  <th
                    key={h}
                    className={`text-center text-[10px] font-bold uppercase tracking-wider pb-2 ${
                      h === 23
                        ? "text-amber-600 border-l border-dashed border-amber-300"
                        : "text-slate-400"
                    }`}
                    title={
                      h === 23
                        ? "Gabungan aktivitas jam 23:00 – 05:59 (+1 hari)"
                        : undefined
                    }
                  >
                    {fmtHourLabel(h)}
                  </th>
                ))}
                <th className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-2 pl-2">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="sticky left-0 bg-white z-10 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                        style={{ background: row.color }}
                      />
                      <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {row.label}
                      </span>
                    </div>
                  </td>
                  {row.values.map((v, i) => {
                    const intensity = overallMax > 0 ? v / overallMax : 0;
                    // Skala: value 0 → abu-abu sangat muda, max → full color
                    const bg =
                      v === 0
                        ? "#f8fafc"
                        : hexToRgba(row.color, 0.08 + intensity * 0.85);
                    const textColor =
                      intensity > 0.55 ? "#fff" : "#0f172a";

                    return (
                      <td
                          key={i}
                          className={`p-0 ${
                            hours[i] === 23 ? "border-l border-dashed border-amber-300" : ""
                          }`}
                        >
                        <div
                          className="flex items-center justify-center h-9 rounded-md text-[10px] font-semibold tabular-nums transition-colors"
                          style={{ backgroundColor: bg, color: textColor }}
                          title={`${row.label} · ${fmtHourFull(hours[i])} · ${v} scan`}
                        >
                          {v > 0 ? v : ""}
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-right pl-2">
                    <span className="text-xs font-bold text-slate-800 tabular-nums">
                      {row.total.toLocaleString("id-ID")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500">
          <span>Intensitas:</span>
          <div className="flex items-center gap-0.5">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((a) => (
              <div
                key={a}
                className="w-4 h-3 rounded-sm"
                style={{ backgroundColor: hexToRgba("#0B2B4A", a) }}
              />
            ))}
          </div>
          <span className="ml-1">Rendah → Tinggi</span>
        </div>
      </div>

      {/* ============================================= */}
      {/* STACKED AREA CHART                             */}
      {/* ============================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Volume Scan per Jam (Stacked)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kontribusi tiap flow per jam
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {rows.map((r) => (
              <span key={r.key} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: r.color }}
                />
                {r.label}
              </span>
            ))}
          </div>
        </div>

        <StackedAreaChart
          hours={hours}
          rows={rows}
          overallMax={overallMax}
        />
      </div>
    </div>
  );
}

// =============================================
// SUB-COMPONENTS
// =============================================

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "navy",
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  accent?: "navy" | "orange" | "violet" | "green";
}) {
  const accents: Record<string, string> = {
    navy: "bg-slate-100 text-slate-700",
    orange: "bg-orange-50 text-orange-600",
    violet: "bg-violet-50 text-violet-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums truncate">
            {value}
          </p>
          {sub && (
            <p className="mt-0.5 text-[11px] text-slate-500 truncate">
              {sub}
            </p>
          )}
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function StackedAreaChart({
  hours,
  rows,
  overallMax,
}: {
  hours: number[];
  rows: ScanRow[];
  overallMax: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 900;
  const H = 260;
  const L = 44;
  const R = 16;
  const T = 16;
  const B = 30;

  const innerW = W - L - R;
  const innerH = H - T - B;
  const n = hours.length;

  // Total per jam (untuk sumbu Y)
  const totals = hours.map((_, i) =>
    rows.reduce((sum, r) => sum + r.values[i], 0)
  );
  const maxTotal = niceMax(Math.max(overallMax, ...totals));

  const x = (i: number) => L + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const y = (v: number) => T + innerH * (1 - v / maxTotal);

  // Hitung cumulative layers
  const layers = rows.map((_, rowIdx) =>
    hours.map((_, hourIdx) =>
      rows
        .slice(0, rowIdx + 1)
        .reduce((sum, r) => sum + r.values[hourIdx], 0)
    )
  );

  // Build path untuk area (bottom = layer[rowIdx-1] atau 0)
  const areaPaths = rows.map((_, rowIdx) => {
    const top = layers[rowIdx];
    const bottom = rowIdx > 0 ? layers[rowIdx - 1] : new Array(n).fill(0);

    const topPts = top.map((v, i) => `${x(i)},${y(v)}`);
    const bottomPts = bottom.map((v, i) => `${x(i)},${y(v)}`).reverse();

    return `M ${topPts.join(" L ")} L ${bottomPts.join(" L ")} Z`;
  });

  // Line path per row (top edge only)
  const linePaths = rows.map((_, rowIdx) => {
    const top = layers[rowIdx];
    return top.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)},${y(v)}`).join(" ");
  });

  // Y ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) =>
    Math.round(maxTotal * f)
  );

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const rel = (px - L) / innerW;
    const i = Math.round(rel * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const hp = hover !== null ? hover : null;
  const hoverLeft = hp !== null ? Math.min(85, Math.max(15, (x(hp) / W) * 100)) : 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={L}
              x2={W - R}
              y1={y(t)}
              y2={y(t)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={L - 6}
              y={y(t) + 3}
              textAnchor="end"
              fontSize="10"
              fill="#94a3b8"
            >
              {t.toLocaleString("id-ID")}
            </text>
          </g>
        ))}

        {/* Stacked areas */}
        {rows.map((row, idx) => (
          <g key={row.key}>
            <path
              d={areaPaths[idx]}
              fill={hexToRgba(row.color, 0.75)}
              stroke="none"
            />
            <path
              d={linePaths[idx]}
              fill="none"
              stroke={row.color}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </g>
        ))}

        {/* X labels */}
        {hours.map((h, i) =>
          i % 2 === 0 ? (
            <text
              key={h}
              x={x(i)}
              y={H - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#94a3b8"
            >
              {String(h).padStart(2, "0")}:00
            </text>
          ) : null
        )}

        {/* Hover line */}
        {hp !== null && (
          <line
            x1={x(hp)}
            x2={x(hp)}
            y1={T}
            y2={H - B}
            stroke="#cbd5e1"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {hp !== null && (
        <div
          className="absolute top-0 -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs pointer-events-none z-10 min-w-[170px]"
          style={{ left: `${hoverLeft}%` }}
        >
          <p className="font-bold text-slate-800 mb-1.5">
            {hours[hp] === 23
              ? "≥ 23:00 (sd 05:59)"
              : `${String(hours[hp]).padStart(2, "0")}:00 – ${String(
                  (hours[hp] + 1) % 24
                ).padStart(2, "0")}:00`}
          </p>
          {rows.map((r) => (
            <p
              key={r.key}
              className="flex items-center justify-between gap-4 text-slate-600"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ background: r.color }}
                />
                {r.label}
              </span>
              <span className="font-semibold tabular-nums">
                {r.values[hp].toLocaleString("id-ID")}
              </span>
            </p>
          ))}
          <p className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-slate-800 font-bold">
            <span>Total</span>
            <span className="tabular-nums">
              {rows
                .reduce((sum, r) => sum + r.values[hp], 0)
                .toLocaleString("id-ID")}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function niceMax(v: number) {
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return f * p;
}