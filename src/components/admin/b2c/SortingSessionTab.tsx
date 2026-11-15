"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Package, Scan, Zap } from "lucide-react";
import showToast from "@/lib/toast";
import { downloadFromApi } from "@/lib/download";
import { buildQuery, formatDateTime, toDateString } from "@/lib/format";
import { useAdminList } from "@/hooks/useAdminList";
import { useDebounce } from "@/hooks/useDebounce";
import {
  CARD,
  CopyButton,
  DateRangeFilter,
  ErrorBanner,
  ExportButton,
  FilterChips,
  PaginationBar,
  RefreshControls,
  SearchInput,
  StatCard,
  TableShell,
  type Column,
} from "./shared";
import type { SortingDetail, SortingStats, TabProps } from "./types";

type SessionFilter = "all" | "running" | "closed";
type SourceFilter = "all" | "sorting" | "instant";
type HandoverFilter = "all" | "done" | "pending" | "discrepancy";

const SESSION_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "running", label: "Running" },
  { value: "closed", label: "Closed" },
] as const;

const SOURCE_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "sorting", label: "Regular" },
  { value: "instant", label: "Instant" },
] as const;

const HANDOVER_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "done", label: "Sudah" },
  { value: "pending", label: "Belum" },
  { value: "discrepancy", label: "Discrepancy" },
] as const;

const COLUMNS: Column[] = [
  { label: "Resi" },
  { label: "Session" },
  { label: "Transporter" },
  { label: "Source" },
  { label: "Sesi" },
  { label: "Handover" },
  { label: "Sorting By" },
  { label: "Scanned At" },
];

function SourceBadge({ type }: { type: SortingDetail["source_type"] }) {
  if (type === "instant") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
        <Zap className="w-3 h-3" /> Instant
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
      <Package className="w-3 h-3" /> Regular
    </span>
  );
}

function HandoverBadge({ row }: { row: SortingDetail }) {
  if (row.discrepancy_reason) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
        <AlertCircle className="w-3 h-3" /> {row.discrepancy_reason}
      </span>
    );
  }

  const done =
    row.source_type === "instant" ? row.instant_status === "PICKED" : row.is_validated_handover;

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Sudah
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
      Belum
    </span>
  );
}

export default function SortingSessionTab({ pollMs }: TabProps) {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim());
  const [sessionStatus, setSessionStatus] = useState<SessionFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [handover, setHandover] = useState<HandoverFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const filters = {
    search,
    session_status: sessionStatus === "all" ? undefined : sessionStatus,
    source: source === "all" ? undefined : source,
    handover: handover === "all" ? undefined : handover,
    date_from: dateFrom,
    date_to: dateTo,
  };

  const { data: rows, stats, pagination, loading, refreshing, error, lastUpdated, setPage, refetch } =
    useAdminList<SortingDetail, SortingStats>({
      endpoint: "/api/admin/sorting-details",
      filters,
      limit: 20,
      pollMs,
    });

  const hasActiveFilters =
    !!search ||
    sessionStatus !== "all" ||
    source !== "all" ||
    handover !== "all" ||
    !!dateFrom ||
    !!dateTo;

  const resetFilters = () => {
    setSearchInput("");
    setSessionStatus("all");
    setSource("all");
    setHandover("all");
    setDateFrom("");
    setDateTo("");
  };

  const toggleHandover = (value: Exclude<HandoverFilter, "all">) =>
    setHandover((cur) => (cur === value ? "all" : value));

  const handleExport = async () => {
    setExporting(true);
    try {
      const query = buildQuery(filters);
      await downloadFromApi(
        `/api/admin/sorting-details/export${query ? `?${query}` : ""}`,
        `sorting-details-${toDateString()}.csv`
      );
      showToast.success("CSV sorting details berhasil diunduh");
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : "Gagal mengekspor sorting details");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Stat cards: klik untuk memfilter */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            label="Total Scan"
            value={stats.total || 0}
            active={handover === "all" && sessionStatus === "all"}
            onClick={() => {
              setHandover("all");
              setSessionStatus("all");
            }}
          />
          <StatCard
            label="Sudah Handover"
            value={stats.handed_over || 0}
            tone="emerald"
            active={handover === "done"}
            onClick={() => toggleHandover("done")}
          />
          <StatCard
            label="Belum Handover"
            value={stats.pending || 0}
            tone="amber"
            active={handover === "pending"}
            onClick={() => toggleHandover("pending")}
          />
          <StatCard
            label="Discrepancy"
            value={stats.discrepancy || 0}
            tone="rose"
            active={handover === "discrepancy"}
            onClick={() => toggleHandover("discrepancy")}
          />
          <StatCard
            label="Di Sesi Running"
            value={stats.in_running_session || 0}
            tone="blue"
            active={sessionStatus === "running"}
            onClick={() => setSessionStatus((cur) => (cur === "running" ? "all" : "running"))}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className={`${CARD} p-4 space-y-3`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari nomor resi, session code, atau transporter..."
          />
          <div className="flex items-center gap-2">
            <ExportButton label="Export CSV" exporting={exporting} onClick={handleExport} />
            <RefreshControls
              lastUpdated={lastUpdated}
              busy={loading || refreshing}
              pollMs={pollMs}
              onRefresh={refetch}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <FilterChips label="Status sesi" options={SESSION_OPTIONS} value={sessionStatus} onChange={setSessionStatus} />
          <FilterChips label="Sumber" options={SOURCE_OPTIONS} value={source} onChange={setSource} />
          <FilterChips label="Status handover" options={HANDOVER_OPTIONS} value={handover} onChange={setHandover} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
            }}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* Tabel */}
      <TableShell
        columns={COLUMNS}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyIcon={Scan}
        emptyText={hasActiveFilters ? "Tidak ada data yang cocok dengan filter" : "Belum ada data sorting"}
        footer={<PaginationBar pagination={pagination} onPageChange={setPage} />}
      >
        {rows.map((r) => (
          <tr key={`${r.source_type}-${r.id}`} className="hover:bg-slate-50 transition-colors">
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs font-bold text-slate-800">{r.barcode_resi}</span>
                <CopyButton text={r.barcode_resi} />
              </div>
            </td>
            <td className="px-4 py-2.5">
              <button
                type="button"
                onClick={() => setSearchInput(r.session_code)}
                title="Filter ke sesi ini"
                className="font-mono text-xs text-slate-600 hover:text-[#0B2B4A] hover:underline"
              >
                {r.session_code}
              </button>
            </td>
            <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">{r.transporter_name || "-"}</td>
            <td className="px-4 py-2.5">
              <SourceBadge type={r.source_type} />
            </td>
            <td className="px-4 py-2.5">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  r.session_status === "RUNNING" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {r.session_status}
              </span>
            </td>
            <td className="px-4 py-2.5">
              <HandoverBadge row={r} />
            </td>
            <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">{r.sorting_by_name || "-"}</td>
            <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
              {formatDateTime(r.scanned_at)}
            </td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}