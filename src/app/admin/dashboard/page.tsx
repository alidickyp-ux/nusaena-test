"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DistributedTab from "@/components/admin/DistributedTab";
import {
  Package,
  Handshake,
  Clock,
  CheckCircle,
  RefreshCw,
  Box,
  Search,
  Building2,
  Truck,
  Activity,
  FileText,
  Warehouse,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Download,
  ArrowUp,
  ArrowDown,
  Info,
  TrendingUp,
} from "lucide-react";
import { toast } from "@/lib/toast";

// =============================================
// TYPES
// =============================================
type Tab = "all" | "b2c" | "instant" | "b2b";
type Preset = "today" | "yesterday" | "7d" | "30d" | "custom";
type AccentColor = "navy" | "orange" | "green" | "red" | "purple" | "blue" | "violet";

interface B2CPeriod {
  sessions: number;
  handovers: number;
  handed_packages: number;
  discrepancy: number;
  discrepancy_handovers: number;
  packages: number;
  validated_packages: number;
  pending_packages: number;
}

interface InstantPeriod {
  putaway: number;
  picked: number;
}

interface B2BPeriod {
  putaway_box: number;
  loaded_box: number;
  total_references: number;
  total_vendors: number;
  total_sites: number;
  total_weight: number;
  total_volume: number;
}

interface TrendPoint {
  bucket: string;
  b2c: number;
  instant: number;
  b2b: number;
}

interface DashboardAlert {
  key: string;
  level: "danger" | "warning" | "info";
  count: number;
  message: string;
}

interface DashboardData {
  range: {
    from: string;
    to: string;
    prevFrom: string;
    prevTo: string;
    days: number;
    hourly: boolean;
  };
  stats: {
    b2c: B2CPeriod & { active_sessions: number };
    instant: InstantPeriod & {
      stored_packages: number;
      completed_total: number;
      is_available: boolean;
    };
    b2b: B2BPeriod & { staging_box: number; is_available: boolean };
  };
  previous: {
    b2c: B2CPeriod;
    instant: InstantPeriod;
    b2b: B2BPeriod;
  };
  trend: TrendPoint[];
  alerts: DashboardAlert[];
}

interface RecentActivity {
  type: string;
  id: string;
  created_at: string;
  code: string;
  name: string;
  detail: string;
  total_items: number;
}

// =============================================
// DATE HELPERS (zona Asia/Jakarta)
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

const fmtBucket = (bucket: string, hourly: boolean) =>
  hourly ? `${bucket.slice(11, 13)}:00` : fmtDay(bucket);

// =============================================
// NUMBER HELPERS
// =============================================
const formatNumber = (num: number | string | null | undefined) => {
  const n = typeof num === "string" ? parseFloat(num) : num || 0;
  return n.toLocaleString("id-ID");
};

const formatWeight = (num: number | string | null | undefined) => {
  const n = typeof num === "string" ? parseFloat(num) : num || 0;
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
};

const pct = (cur: number, prev: number): number | null =>
  prev ? Math.round(((cur - prev) / prev) * 100) : null;

// =============================================
// MAIN COMPONENT
// =============================================
export default function AdminDashboardPage() {
  const [preset, setPreset] = useState<Preset>("today");
  const [range, setRange] = useState(() => presetRange("today"));
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [dashboardTab, setDashboardTab] = useState<"overview" | "distributed">(
    "overview"
  );

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState("");

  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [actLimit, setActLimit] = useState(10);
  const [actLoading, setActLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const statsReq = useRef(0);
  const actReq = useRef(0);

  // ---------- Fetch stats ----------
  const fetchStats = useCallback(
    async (silent = false) => {
      const id = ++statsReq.current;
      if (!silent) setUpdating(true);
      try {
        const qs = new URLSearchParams({ from: range.from, to: range.to });
        const res = await fetch(`/api/admin/dashboard/stats?${qs}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
        const json = await res.json();
        if (id !== statsReq.current) return;
        if (res.ok && json.success) {
          setData(json);
          setError(null);
          setLastUpdate(new Date().toLocaleTimeString("id-ID"));
        } else {
          setError(json.message || "Gagal memuat data");
        }
      } catch (err) {
        console.error("Error fetching dashboard:", err);
        if (id === statsReq.current) setError("Gagal terhubung ke server");
      } finally {
        if (id === statsReq.current) {
          setLoading(false);
          setUpdating(false);
        }
      }
    },
    [range.from, range.to]
  );

  // ---------- Fetch activity ----------
  const fetchActivity = useCallback(
    async (silent = false) => {
      const id = ++actReq.current;
      if (!silent) setActLoading(true);
      try {
        const qs = new URLSearchParams({
          from: range.from,
          to: range.to,
          type: activeTab,
          limit: String(actLimit),
          q: search,
        });
        const res = await fetch(`/api/admin/dashboard/activity?${qs}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (id !== actReq.current) return;
        if (res.ok && json.success) {
          setActivities(json.activities || []);
          setHasMore(!!json.hasMore);
        }
      } catch (err) {
        console.error("Error fetching activity:", err);
      } finally {
        if (id === actReq.current) setActLoading(false);
      }
    },
    [range.from, range.to, activeTab, actLimit, search]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setActLimit(10);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Auto-refresh
  useEffect(() => {
    const t = setInterval(() => {
      if (preset !== "custom") {
        const r = presetRange(preset);
        if (r.from !== range.from || r.to !== range.to) {
          setRange(r);
          return;
        }
      }
      if (range.to >= todayStr()) {
        fetchStats(true);
        fetchActivity(true);
      }
    }, 15000);
    return () => clearInterval(t);
  }, [preset, range, fetchStats, fetchActivity]);

  // ---------- Handlers ----------
  const isLive = range.to >= todayStr();

  const handlePreset = (p: Exclude<Preset, "custom">) => {
    setPreset(p);
    setRange(presetRange(p));
    setActLimit(10);
  };

  const handleCustom = (key: "from" | "to", value: string) => {
    if (!value) return;
    setPreset("custom");
    setActLimit(10);
    setRange((prev) => {
      const next = { ...prev, [key]: value };
      if (next.from > next.to) {
        if (key === "from") next.to = next.from;
        else next.from = next.to;
      }
      return next;
    });
  };

  const handleTab = (tab: Tab) => {
    setActiveTab(tab);
    setActLimit(10);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(true), fetchActivity(true)]);
    setRefreshing(false);
    toast.success("✅ Data diperbarui");
  };

  // ---------- Export CSV ----------
  const handleExport = () => {
    if (!data) return;
    const { stats, previous, trend, range: r } = data;

    const rows: (string | number)[][] = [
      ["Periode", `${r.from} s/d ${r.to}`],
      ["Pembanding", `${r.prevFrom} s/d ${r.prevTo}`],
      [],
      ["Flow", "Metrik", "Periode ini", "Periode sebelumnya"],
      ["B2C", "Sessions", stats.b2c.sessions, previous.b2c.sessions],
      ["B2C", "Handover", stats.b2c.handovers, previous.b2c.handovers],
      ["B2C", "Paket handover", stats.b2c.handed_packages, previous.b2c.handed_packages],
      ["B2C", "Total paket", stats.b2c.packages, previous.b2c.packages],
      ["B2C", "Validated", stats.b2c.validated_packages, previous.b2c.validated_packages],
      ["B2C", "Pending", stats.b2c.pending_packages, previous.b2c.pending_packages],
      ["B2C", "Discrepancy", stats.b2c.discrepancy, previous.b2c.discrepancy],
    ];
    if (stats.instant.is_available) {
      rows.push(
        ["Instant", "Putaway", stats.instant.putaway, previous.instant.putaway],
        ["Instant", "Picked", stats.instant.picked, previous.instant.picked]
      );
    }
    if (stats.b2b.is_available) {
      rows.push(
        ["B2B", "Putaway box", stats.b2b.putaway_box, previous.b2b.putaway_box],
        ["B2B", "Loaded box", stats.b2b.loaded_box, previous.b2b.loaded_box],
        ["B2B", "Reference", stats.b2b.total_references, previous.b2b.total_references],
        ["B2B", "Vendor", stats.b2b.total_vendors, previous.b2b.total_vendors],
        ["B2B", "Site", stats.b2b.total_sites, previous.b2b.total_sites],
        ["B2B", "Weight (kg)", stats.b2b.total_weight, previous.b2b.total_weight],
        ["B2B", "Volume (m3)", stats.b2b.total_volume, previous.b2b.total_volume]
      );
    }
    rows.push([], ["Waktu", "B2C (paket handover)", "Instant (picked)", "B2B (box loaded)"]);
    trend.forEach((t) =>
      rows.push([fmtBucket(t.bucket, r.hourly), t.b2c, t.instant, t.b2b])
    );

    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = "\uFEFF" + rows.map((row) => row.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard_${r.from}_${r.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("✅ CSV diunduh");
  };

  // ---------- Loading & error awal ----------
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0B2B4A] rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-slate-700 text-sm mt-3">{error || "Data tidak tersedia"}</p>
          <button
            onClick={() => fetchStats()}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-[#0B2B4A] text-white"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  const { stats, previous, trend, alerts } = data;
  const b2c = stats.b2c;
  const instant = stats.instant;
  const b2b = stats.b2b;
  const hourly = data.range.hourly;

  const trendSeries = [
    { key: "b2c" as const, label: "B2C", color: "#E87A2A", dash: undefined },
    { key: "instant" as const, label: "Instant", color: "#1e40af", dash: "6 3" },
    { key: "b2b" as const, label: "B2B", color: "#6d28d9", dash: "2 3" },
  ].filter((s) => {
    if (activeTab === "all") {
      if (s.key === "instant") return instant.is_available;
      if (s.key === "b2b") return b2b.is_available;
      return true;
    }
    return s.key === activeTab;
  });

  const rangeLabel =
    data.range.from === data.range.to
      ? fmtDay(data.range.from, true)
      : `${fmtDay(data.range.from)} – ${fmtDay(data.range.to, true)}`;
  const prevLabel =
    data.range.prevFrom === data.range.prevTo
      ? fmtDay(data.range.prevFrom)
      : `${fmtDay(data.range.prevFrom)} – ${fmtDay(data.range.prevTo)}`;

  const totalProcessed =
    (b2c.packages || 0) +
    (instant.is_available ? instant.putaway : 0) +
    (b2b.is_available ? b2b.putaway_box : 0);

  return (
    <div className="space-y-6">
      {/* ============================================= */}
      {/* HEADER + TAB SWITCHER                          */}
      {/* ============================================= */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            {dashboardTab === "overview" && isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 ring-1 ring-emerald-200">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Live
                </span>
              </span>
            )}
          </div>
            <p className="text-sm text-slate-500 mt-1">
            {dashboardTab === "overview"
              ? "Overview semua operasi warehouse"
              : "Distribusi scan per jam (06:00–22:00 · >23 gabungan)"}         
               </p>
        </div>

        <div className="flex rounded-xl bg-slate-200/70 p-1 w-fit">
          <button
            onClick={() => setDashboardTab("overview")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              dashboardTab === "overview"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setDashboardTab("distributed")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              dashboardTab === "distributed"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Distributed
          </button>
        </div>
      </div>

      {/* ============================================= */}
      {/* CONTENT — CONDITIONAL                          */}
      {/* ============================================= */}
      {dashboardTab === "overview" ? (
        <>
          {/* ============================================= */}
          {/* STICKY TOOLBAR                                 */}
          {/* ============================================= */}
          <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
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
                  aria-label="Dari tanggal"
                  className="text-xs text-slate-700 bg-transparent focus:outline-none w-[112px]"
                />
                <span className="text-xs text-slate-400">→</span>
                <input
                  type="date"
                  value={range.to}
                  max={todayStr()}
                  onChange={(e) => handleCustom("to", e.target.value)}
                  aria-label="Sampai tanggal"
                  className="text-xs text-slate-700 bg-transparent focus:outline-none w-[112px]"
                />
              </div>

              <div className="flex-1" />

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Refresh data"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>

              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>

            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
              <span>
                {rangeLabel} · dibanding {prevLabel}
              </span>
              <span>Update: {lastUpdate}</span>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}. Menampilkan data terakhir yang berhasil dimuat.
            </div>
          )}

          <div
            className={`space-y-6 transition-opacity ${
              updating ? "opacity-60" : ""
            }`}
          >
            {/* HERO METRIC + ALERTS */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-gradient-to-br from-[#0B2B4A] via-[#123a5e] to-[#1a4a73] p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-white/60" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                      Total Item Diproses
                    </p>
                  </div>
                  <p className="mt-2 text-4xl font-bold tabular-nums">
                    {formatNumber(totalProcessed)}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    Paket B2C + Instant putaway + B2B putaway
                  </p>

                  <div className="mt-5 flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-orange-400" />
                      <span className="text-white/70">B2C</span>
                      <span className="font-bold">
                        {formatNumber(b2c.packages)}
                      </span>
                    </div>
                    {instant.is_available && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-400" />
                        <span className="text-white/70">Instant</span>
                        <span className="font-bold">
                          {formatNumber(instant.putaway)}
                        </span>
                      </div>
                    )}
                    {b2b.is_available && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-violet-400" />
                        <span className="text-white/70">B2B</span>
                        <span className="font-bold">
                          {formatNumber(b2b.putaway_box)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">
                    Perlu Perhatian
                  </h3>
                  {alerts.length > 0 && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
                      {alerts.length}
                    </span>
                  )}
                </div>
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      Semua aman
                    </p>
                    <p className="text-xs text-slate-400">
                      Tidak ada yang perlu tindakan
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.slice(0, 3).map((a) => (
                      <AlertRow key={a.key} alert={a} compact />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* TAB FILTER */}
            <div className="flex flex-wrap gap-2">
              <TabButton
                active={activeTab === "all"}
                onClick={() => handleTab("all")}
                label="Semua"
              />
              <TabButton
                active={activeTab === "b2c"}
                onClick={() => handleTab("b2c")}
                label="📦 B2C"
              />
              <TabButton
                active={activeTab === "instant"}
                onClick={() => handleTab("instant")}
                label="⚡ Instant"
                disabled={!instant.is_available}
              />
              <TabButton
                active={activeTab === "b2b"}
                onClick={() => handleTab("b2b")}
                label="🏢 B2B"
                disabled={!b2b.is_available}
              />
            </div>

            {/* B2C FLOW */}
            {(activeTab === "all" || activeTab === "b2c") && (
              <SectionCard
                icon={Package}
                iconBg="bg-orange-50"
                iconColor="text-orange-600"
                title="B2C Flow"
                subtitle="Sorting & Handover"
                badge="Active"
                badgeColor="emerald"
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard
                    title="Sessions"
                    value={b2c.sessions}
                    delta={pct(b2c.sessions, previous.b2c.sessions)}
                    subtitle={`${formatNumber(b2c.active_sessions)} aktif sekarang`}
                    icon={Package}
                    accent="navy"
                  />
                  <StatCard
                    title="Handovers"
                    value={b2c.handovers}
                    delta={pct(b2c.handovers, previous.b2c.handovers)}
                    subtitle={`${formatNumber(b2c.handed_packages)} paket diserahkan`}
                    icon={Handshake}
                    accent="green"
                  />
                  <StatCard
                    title="Total Paket"
                    value={b2c.packages}
                    delta={pct(b2c.packages, previous.b2c.packages)}
                    subtitle={`${formatNumber(b2c.validated_packages)} validated · ${formatNumber(b2c.pending_packages)} pending`}
                    icon={Box}
                    accent="orange"
                  />
                  <StatCard
                    title="Discrepancy"
                    value={b2c.discrepancy}
                    delta={pct(b2c.discrepancy, previous.b2c.discrepancy)}
                    lowerIsBetter
                    subtitle={`${formatNumber(b2c.discrepancy_handovers)} handover terdampak`}
                    icon={AlertCircle}
                    accent="red"
                  />
                </div>
              </SectionCard>
            )}

            {/* INSTANT FLOW */}
            {(activeTab === "all" || activeTab === "instant") &&
              instant.is_available && (
                <SectionCard
                  icon={Box}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                  title="Instant Flow"
                  subtitle="Putaway & Pickup"
                  badge="Active"
                  badgeColor="emerald"
                >
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard
                      title="Putaway"
                      value={instant.putaway}
                      delta={pct(instant.putaway, previous.instant.putaway)}
                      subtitle="Masuk di periode ini"
                      icon={Package}
                      accent="blue"
                    />
                    <StatCard
                      title="Picked"
                      value={instant.picked}
                      delta={pct(instant.picked, previous.instant.picked)}
                      subtitle="Diambil di periode ini"
                      icon={Search}
                      accent="purple"
                    />
                    <StatCard
                      title="Stored"
                      value={instant.stored_packages}
                      subtitle="Siap pickup (saat ini)"
                      icon={Warehouse}
                      accent="navy"
                    />
                    <StatCard
                      title="Completed"
                      value={instant.completed_total}
                      subtitle="Total selesai (semua waktu)"
                      icon={CheckCircle}
                      accent="green"
                    />
                  </div>
                </SectionCard>
              )}

            {/* B2B FLOW */}
            {(activeTab === "all" || activeTab === "b2b") && b2b.is_available && (
              <SectionCard
                icon={Building2}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                title="B2B Flow"
                subtitle="Putaway & Loading"
                badge="Active"
                badgeColor="emerald"
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard
                    title="Putaway Box"
                    value={b2b.putaway_box}
                    delta={pct(b2b.putaway_box, previous.b2b.putaway_box)}
                    subtitle="Masuk di periode ini"
                    icon={Package}
                    accent="violet"
                  />
                  <StatCard
                    title="Loaded"
                    value={b2b.loaded_box}
                    delta={pct(b2b.loaded_box, previous.b2b.loaded_box)}
                    subtitle="Loading di periode ini"
                    icon={Truck}
                    accent="green"
                  />
                  <StatCard
                    title="Staging"
                    value={b2b.staging_box}
                    subtitle="Belum loading (saat ini)"
                    icon={Clock}
                    accent="orange"
                  />
                  <StatCard
                    title="References"
                    value={b2b.total_references}
                    delta={pct(
                      b2b.total_references,
                      previous.b2b.total_references
                    )}
                    subtitle={`${formatNumber(b2b.total_vendors)} vendor · ${formatNumber(b2b.total_sites)} site`}
                    icon={FileText}
                    accent="navy"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <MiniStat
                    label="Total Weight"
                    value={`${formatWeight(b2b.total_weight)} kg`}
                    accent="violet"
                  />
                  <MiniStat
                    label="Total Volume"
                    value={`${formatWeight(b2b.total_volume)} m³`}
                    accent="blue"
                  />
                  <MiniStat
                    label="Vendors"
                    value={formatNumber(b2b.total_vendors)}
                    accent="navy"
                  />
                  <MiniStat
                    label="Sites"
                    value={formatNumber(b2b.total_sites)}
                    accent="green"
                  />
                </div>
              </SectionCard>
            )}

            {/* B2B not available */}
            {(activeTab === "all" || activeTab === "b2b") && !b2b.is_available && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    B2B Module belum aktif
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Tabel{" "}
                    <code className="bg-amber-100 px-1 rounded">
                      b2b_putaway
                    </code>{" "}
                    belum tersedia di database.
                  </p>
                </div>
              </div>
            )}

            {/* TREND + STATUS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Tren volume {hourly ? "per jam" : "per hari"}
                  </h3>
                  <div className="flex gap-3 text-xs text-slate-500">
                    {trendSeries.map((s) => (
                      <span key={s.key} className="flex items-center gap-1.5">
                        <svg width="18" height="6" aria-hidden="true">
                          <line
                            x1="0"
                            y1="3"
                            x2="18"
                            y2="3"
                            stroke={s.color}
                            strokeWidth="2"
                            strokeDasharray={s.dash}
                          />
                        </svg>
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
                <TrendChart points={trend} series={trendSeries} hourly={hourly} />
                <p className="text-[11px] text-slate-400 mt-2">
                  B2C = paket handover · Instant = paket picked · B2B = box
                  loaded
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-900 text-sm mb-4">
                  Status paket B2C
                </h3>
                <StatusBars
                  items={[
                    {
                      label: "Validated",
                      value: b2c.validated_packages,
                      color: "bg-emerald-500",
                    },
                    {
                      label: "Pending",
                      value: b2c.pending_packages,
                      color: "bg-amber-500",
                    },
                    {
                      label: "Discrepancy",
                      value: b2c.discrepancy,
                      color: "bg-rose-500",
                    },
                  ]}
                />
              </div>
            </div>

            {/* ACTIVITY + ALERTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#0B2B4A]" />
                    Aktivitas Terbaru
                  </h3>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Cari kode, nama, atau lokasi"
                      aria-label="Cari aktivitas"
                      className="text-xs border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 w-56 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                    />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto pr-1">
                  {activities.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      {actLoading
                        ? "Memuat..."
                        : search
                        ? "Tidak ada aktivitas yang cocok"
                        : "Tidak ada aktivitas di periode ini"}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200" />

                      <div className="space-y-4">
                        {activities.map((activity, index) => {
                          const cfg = getActivityIcon(activity.type);
                          return (
                            <div
                              key={`${activity.type}-${activity.id}-${index}`}
                              className="relative flex gap-3 group"
                            >
                              <div
                                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${cfg.bg}`}
                              >
                                {cfg.icon}
                              </div>

                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm">
                                      <span className="font-semibold text-slate-900">
                                        {cfg.label}
                                      </span>{" "}
                                      <span className="font-mono text-xs text-slate-600">
                                        {activity.code}
                                      </span>
                                    </p>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                      {activity.name}
                                      {activity.detail &&
                                        ` · ${activity.detail}`}
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap">
                                    {activity.created_at
                                      ? new Date(
                                          activity.created_at
                                        ).toLocaleString("id-ID", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          day: "2-digit",
                                          month: "short",
                                          timeZone: "Asia/Jakarta",
                                        })
                                      : "-"}
                                  </span>
                                </div>

                                {activity.total_items > 0 &&
                                  activity.type !== "b2b_loading" && (
                                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                      {activity.total_items} item
                                    </div>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {hasMore && (
                  <button
                    onClick={() => setActLimit((l) => l + 10)}
                    disabled={actLoading}
                    className="w-full mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
                  >
                    {actLoading ? "Memuat..." : "Muat lebih banyak"}
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-900 text-sm mb-4">
                  Semua Peringatan
                </h3>
                {alerts.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                    Semua aman
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((a) => (
                      <AlertRow key={a.key} alert={a} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <DistributedTab />
      )}
    </div>
  );
}

// =============================================
// COMPONENTS
// =============================================

function TabButton({ active, onClick, label, disabled, small }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${small ? "px-3 py-1.5" : "px-4 py-2"} rounded-lg text-sm font-medium transition-all
        ${
          active
            ? "bg-[#0B2B4A] text-white shadow-lg shadow-[#0B2B4A]/20"
            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
      `}
    >
      {label}
    </button>
  );
}

function SectionCard({
  icon: Icon,
  iconBg = "bg-slate-100",
  iconColor = "text-slate-600",
  title,
  subtitle,
  badge,
  badgeColor = "emerald",
  children,
}: {
  icon: any;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: "emerald" | "orange" | "blue" | "violet" | "slate";
  children: React.ReactNode;
}) {
  const badgeStyles: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                  badgeStyles[badgeColor]
                }`}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "navy",
  delta,
  lowerIsBetter,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: any;
  accent?: AccentColor;
  delta?: number | null;
  lowerIsBetter?: boolean;
}) {
  const hasDelta = delta !== null && delta !== undefined && delta !== 0;
  const good = hasDelta && (lowerIsBetter ? delta! <= 0 : delta! >= 0);

  const accents: Record<AccentColor, { icon: string; ring: string }> = {
    navy: {
      icon: "bg-slate-100 text-slate-700",
      ring: "hover:border-slate-300",
    },
    orange: {
      icon: "bg-orange-50 text-orange-600",
      ring: "hover:border-orange-200",
    },
    green: {
      icon: "bg-emerald-50 text-emerald-600",
      ring: "hover:border-emerald-200",
    },
    red: { icon: "bg-rose-50 text-rose-600", ring: "hover:border-rose-200" },
    purple: {
      icon: "bg-violet-50 text-violet-600",
      ring: "hover:border-violet-200",
    },
    blue: { icon: "bg-blue-50 text-blue-600", ring: "hover:border-blue-200" },
    violet: {
      icon: "bg-violet-50 text-violet-600",
      ring: "hover:border-violet-200",
    },
  };
  const a = accents[accent];

  return (
    <div
      className={`group relative rounded-2xl border border-slate-200 bg-white p-4 transition-all ${a.ring} hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {Number(value || 0).toLocaleString("id-ID")}
            </p>
            {hasDelta && (
              <span
                title="Dibanding periode sebelumnya"
                className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  good
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {delta! >= 0 ? (
                  <ArrowUp className="w-2.5 h-2.5" />
                ) : (
                  <ArrowDown className="w-2.5 h-2.5" />
                )}
                {Math.abs(delta!)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 truncate text-[11px] text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.icon}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent = "navy",
}: {
  label: string;
  value: string;
  accent?: AccentColor;
}) {
  const accents: Record<AccentColor, { bg: string; text: string }> = {
    navy: { bg: "bg-slate-50", text: "text-slate-700" },
    orange: { bg: "bg-orange-50", text: "text-orange-600" },
    green: { bg: "bg-emerald-50", text: "text-emerald-600" },
    red: { bg: "bg-rose-50", text: "text-rose-600" },
    purple: { bg: "bg-violet-50", text: "text-violet-600" },
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    violet: { bg: "bg-violet-50", text: "text-violet-600" },
  };
  const a = accents[accent];

  return (
    <div className={`${a.bg} rounded-lg p-3`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-base font-bold ${a.text} truncate`}>{value}</p>
    </div>
  );
}

function AlertRow({
  alert,
  compact,
}: {
  alert: DashboardAlert;
  compact?: boolean;
}) {
  const cfg =
    alert.level === "danger"
      ? {
          Icon: AlertCircle,
          color: "text-rose-600",
          bg: "bg-rose-50",
          ring: "ring-rose-200",
          dot: "bg-rose-500",
        }
      : alert.level === "warning"
      ? {
          Icon: AlertTriangle,
          color: "text-amber-600",
          bg: "bg-amber-50",
          ring: "ring-amber-200",
          dot: "bg-amber-500",
        }
      : {
          Icon: Info,
          color: "text-blue-600",
          bg: "bg-blue-50",
          ring: "ring-blue-200",
          dot: "bg-blue-500",
        };

  const { Icon } = cfg;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl ${cfg.bg} ring-1 ${cfg.ring} ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-700 leading-relaxed">
          {alert.message}
        </p>
        {alert.count > 0 && (
          <span
            className={`mt-1.5 inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-bold ${cfg.color}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {alert.count} item
          </span>
        )}
      </div>
    </div>
  );
}

function StatusBars({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-4">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-600">{i.label}</span>
            <span className="font-semibold text-slate-800">
              {formatNumber(i.value)}
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${i.color} transition-all duration-500`}
              style={{ width: `${(i.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Chart helpers ----------
function niceMax(v: number) {
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return f * p;
}

function TrendChart({
  points,
  series,
  hourly,
}: {
  points: TrendPoint[];
  series: {
    key: "b2c" | "instant" | "b2b";
    label: string;
    color: string;
    dash?: string;
  }[];
  hourly: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 600;
  const H = 220;
  const L = 42;
  const R = 12;
  const T = 12;
  const B = 26;

  const rawMax = Math.max(
    0,
    ...points.flatMap((p) => series.map((s) => p[s.key]))
  );
  const top = niceMax(rawMax);
  const innerW = W - L - R;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;

  const x = (i: number) =>
    points.length > 1 ? L + i * step : L + innerW / 2;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));
  const showDots = points.length <= 14;

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = step ? Math.round((px - L) / step) : 0;
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };

  const hp = hover !== null ? points[hover] : null;
  const hoverLeft =
    hover !== null ? Math.min(85, Math.max(15, (x(hover) / W) * 100)) : 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Grafik tren volume B2C, Instant, dan B2B"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient
              key={s.key}
              id={`grad-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((t) => (
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

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={p.bucket}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#94a3b8"
            >
              {fmtBucket(p.bucket, hourly)}
            </text>
          ) : null
        )}

        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={T}
            y2={H - B}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
        )}

        {series.map((s, sIdx) => {
          const linePath = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)},${y(p[s.key])}`)
            .join(" ");
          const areaPath =
            points.length > 0
              ? `${linePath} L ${x(points.length - 1)},${y(0)} L ${x(0)},${y(
                  0
                )} Z`
              : "";

          return (
            <g key={s.key}>
              {sIdx === 0 && areaPath && (
                <path d={areaPath} fill={`url(#grad-${s.key})`} />
              )}
              <path
                d={linePath}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dash}
              />
              {(showDots || hover !== null) &&
                points.map((p, i) =>
                  showDots || i === hover ? (
                    <circle
                      key={i}
                      cx={x(i)}
                      cy={y(p[s.key])}
                      r={i === hover ? 4 : 2.5}
                      fill={s.color}
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                  ) : null
                )}
            </g>
          );
        })}
      </svg>

      {rawMax === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 pointer-events-none">
          Belum ada data di periode ini
        </div>
      )}

      {hp && (
        <div
          className="absolute top-0 -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs pointer-events-none"
          style={{ left: `${hoverLeft}%` }}
        >
          <p className="font-medium text-slate-700 mb-1">
            {fmtBucket(hp.bucket, hourly)}
          </p>
          {series.map((s) => (
            <p
              key={s.key}
              className="flex items-center justify-between gap-4 text-slate-500"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ background: s.color }}
                />
                {s.label}
              </span>
              <span className="font-semibold text-slate-800">
                {formatNumber(hp[s.key])}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================
// HELPER
// =============================================
function getActivityIcon(type: string) {
  switch (type) {
    case "handover":
      return {
        icon: <Handshake className="w-4 h-4 text-emerald-600" />,
        bg: "bg-emerald-100",
        label: "Handover",
      };
    case "b2b_loading":
      return {
        icon: <Truck className="w-4 h-4 text-blue-600" />,
        bg: "bg-blue-100",
        label: "B2B Loading",
      };
    case "instant_pickup":
      return {
        icon: <Search className="w-4 h-4 text-violet-600" />,
        bg: "bg-violet-100",
        label: "Pickup",
      };
    default:
      return {
        icon: <Activity className="w-4 h-4 text-slate-600" />,
        bg: "bg-slate-100",
        label: "Activity",
      };
  }
}