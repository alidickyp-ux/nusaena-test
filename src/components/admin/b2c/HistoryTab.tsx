"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Package, XCircle, Zap } from "lucide-react";
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
import type { HistoryLog, HistoryStats, HistoryStatus, TabProps } from "./types";

type TypeFilter = "all" | "instant" | "regular";
type StatusFilter = "all" | HistoryStatus;

const TYPE_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "instant", label: "Instant" },
  { value: "regular", label: "Regular" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "DONE", label: "Done" },
  { value: "CANCELLED", label: "Cancel" },
  { value: "NOT_FOUND", label: "Not Found" },
] as const;

const COLUMNS: Column[] = [
  { label: "Session Code" },
  { label: "Resi Number" },
  { label: "Transporter" },
  { label: "Status" },
  { label: "Type" },
  { label: "Location" },
  { label: "Handover By" },
  { label: "Tanggal" },
];

function StatusBadge({ status }: { status: HistoryStatus }) {
  switch (status) {
    case "DONE":
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit">
          <CheckCircle2 className="w-3 h-3" /> Done
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit">
          <AlertCircle className="w-3 h-3" /> Cancel
        </span>
      );
    case "NOT_FOUND":
      return (
        <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit">
          <XCircle className="w-3 h-3" /> Not Found
        </span>
      );
    default:
      return <span className="text-[10px] text-slate-500 font-medium">{String(status)}</span>;
  }
}

export default function HistoryTab({ pollMs }: TabProps) {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim());
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const filters = {
    search,
    is_instant: type === "all" ? undefined : type === "instant" ? "true" : "false",
    status: status === "all" ? undefined : status,
    date_from: dateFrom,
    date_to: dateTo,
  };

  const { data: rows, stats, pagination, loading, refreshing, error, lastUpdated, setPage, refetch } =
    useAdminList<HistoryLog, HistoryStats>({
      endpoint: "/api/admin/history",
      filters,
      limit: 20,
      pollMs,
    });

  const hasActiveFilters = !!search || type !== "all" || status !== "all" || !!dateFrom || !!dateTo;

  const resetFilters = () => {
    setSearchInput("");
    setType("all");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
  };

  const toggleStatus = (value: HistoryStatus) => setStatus((cur) => (cur === value ? "all" : value));
  const toggleType = (value: Exclude<TypeFilter, "all">) => setType((cur) => (cur === value ? "all" : value));

  const handleExport = async () => {
    setExporting(true);
    try {
      const query = buildQuery(filters);
      await downloadFromApi(
        `/api/admin/history/export${query ? `?${query}` : ""}`,
        `history-logs-${toDateString()}.csv`
      );
      showToast.success("CSV history logs berhasil diunduh");
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : "Gagal mengekspor CSV");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Stat cards: klik untuk memfilter */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard
            label="Total"
            value={stats.total}
            active={status === "all" && type === "all"}
            onClick={() => {
              setStatus("all");
              setType("all");
            }}
          />
          <StatCard label="Done" value={stats.done} tone="emerald" active={status === "DONE"} onClick={() => toggleStatus("DONE")} />
          <StatCard label="Cancel" value={stats.cancelled} tone="amber" active={status === "CANCELLED"} onClick={() => toggleStatus("CANCELLED")} />
          <StatCard label="Not Found" value={stats.not_found} tone="rose" active={status === "NOT_FOUND"} onClick={() => toggleStatus("NOT_FOUND")} />
          <StatCard label="Instant" value={stats.instant} tone="blue" active={type === "instant"} onClick={() => toggleType("instant")} />
          <StatCard label="Regular" value={stats.regular} tone="orange" active={type === "regular"} onClick={() => toggleType("regular")} />
        </div>
      )}

      {/* Toolbar */}
      <div className={`${CARD} p-4 space-y-3`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari resi, session code, atau transporter..."
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
          <FilterChips label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          <FilterChips label="Tipe" options={TYPE_OPTIONS} value={type} onChange={setType} />
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
        emptyIcon={Clock}
        emptyText={hasActiveFilters ? "Tidak ada data yang cocok dengan filter" : "Belum ada history logs"}
        footer={<PaginationBar pagination={pagination} onPageChange={setPage} />}
      >
        {rows.map((h) => (
          <tr key={h.id} className="hover:bg-slate-50 transition-colors">
            <td className="px-4 py-2.5">
              <button
                type="button"
                onClick={() => setSearchInput(h.session_code)}
                title="Filter ke sesi ini"
                className="font-mono text-xs font-bold text-slate-800 hover:text-[#0B2B4A] hover:underline"
              >
                {h.session_code}
              </button>
            </td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs text-slate-600">{h.resi_number}</span>
                <CopyButton text={h.resi_number} />
              </div>
            </td>
            <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">{h.transporter_name}</td>
            <td className="px-4 py-2.5">
              <StatusBadge status={h.status} />
            </td>
            <td className="px-4 py-2.5">
              {h.is_instant ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                  <Zap className="w-3 h-3" /> Instant
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                  <Package className="w-3 h-3" /> Regular
                </span>
              )}
            </td>
            <td className="px-4 py-2.5">
              <span className="text-xs font-mono font-bold text-blue-600">{h.location_code || "-"}</span>
            </td>
            <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">{h.handover_by || "-"}</td>
            <td className="px-4 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">
              {formatDateTime(h.handover_at)}
            </td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}