"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, FileText, Printer } from "lucide-react";
import showToast from "@/lib/toast";
import { downloadFromApi } from "@/lib/download";
import { formatDateTime, toDateString } from "@/lib/format";
import { useAdminList, useKeyedPage } from "@/hooks/useAdminList";
import { useDebounce } from "@/hooks/useDebounce";
import {
  CARD,
  DateRangeFilter,
  ErrorBanner,
  PaginationBar,
  RefreshControls,
  SearchInput,
  StatCard,
  TableShell,
  type Column,
} from "./shared";
import type { Manifest, Pagination, TabProps } from "./types";

const LIMIT = 20;

const COLUMNS: Column[] = [
  { label: "Session Code" },
  { label: "Transporter" },
  { label: "Kurir / Security" },
  {
    label: "Sesuai / Total",
    title: "Paket sesuai dibanding total paket diserahkan. Badge merah = jumlah discrepancy.",
  },
  { label: "Tanggal" },
  { label: "Aksi", align: "right" },
];

function includesText(value: string | null | undefined, q: string) {
  return (value ?? "").toLowerCase().includes(q);
}

export default function ManifestTab({ pollMs }: TabProps) {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim().toLowerCase());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);

  // /api/manifest belum mendukung page/search/tanggal, jadi data dimuat sekali
  // lalu difilter dan dipaginasi di client.
  const { data: all, loading, refreshing, error, lastUpdated, refetch } = useAdminList<Manifest>({
    endpoint: "/api/manifest",
    filters: {},
    paginated: false,
    pollMs,
  });

  const filtered = useMemo(() => {
    return all
      .filter((m) => {
        if (search) {
          const hit =
            includesText(m.session_code, search) ||
            includesText(m.transporter_name, search) ||
            includesText(m.courier_name, search) ||
            includesText(m.security_name, search);
          if (!hit) return false;
        }
        if (dateFrom || dateTo) {
          const t = new Date(m.signed_at);
          if (Number.isNaN(t.getTime())) return false;
          const day = toDateString(t);
          if (dateFrom && day < dateFrom) return false;
          if (dateTo && day > dateTo) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime());
  }, [all, search, dateFrom, dateTo]);

  const summary = useMemo(
    () =>
      filtered.reduce(
        (acc, m) => {
          acc.packages += Number(m.total_packages_handed) || 0;
          acc.discrepancy += Number(m.total_discrepancy) || 0;
          return acc;
        },
        { packages: 0, discrepancy: 0 }
      ),
    [filtered]
  );

  const [page, setPage] = useKeyedPage(`${search}|${dateFrom}|${dateTo}`);
  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * LIMIT, safePage * LIMIT);

  const pagination: Pagination = {
    page: safePage,
    limit: LIMIT,
    total: filtered.length,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };

  const hasActiveFilters = !!search || !!dateFrom || !!dateTo;

  const resetFilters = () => {
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
  };

  const handleExportExcel = async (id: string) => {
    setExportingId(id);
    try {
      await downloadFromApi(`/api/manifest/${id}/export`, `manifest-${id}.xlsx`);
      showToast.success("Excel berhasil diunduh");
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : "Gagal export excel");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Ringkasan sesuai filter yang aktif */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Manifest" value={filtered.length} />
        <StatCard label="Paket Diserahkan" value={summary.packages} tone="emerald" />
        <StatCard label="Discrepancy" value={summary.discrepancy} tone="rose" />
      </div>

      {/* Toolbar */}
      <div className={`${CARD} p-4 space-y-3`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari manifest (session code, transporter, kurir, security)..."
          />
          <RefreshControls
            lastUpdated={lastUpdated}
            busy={loading || refreshing}
            pollMs={pollMs}
            onRefresh={refetch}
          />
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
        isEmpty={pageRows.length === 0}
        emptyIcon={FileText}
        emptyText={hasActiveFilters ? "Tidak ada manifest yang sesuai filter" : "Belum ada manifest"}
        footer={<PaginationBar pagination={pagination} onPageChange={setPage} />}
      >
        {pageRows.map((m) => {
          const handed = Number(m.total_packages_handed) || 0;
          const disc = Number(m.total_discrepancy) || 0;
          return (
            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <span className="font-mono text-xs font-bold text-slate-800">{m.session_code}</span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-600 font-medium">{m.transporter_name || "-"}</td>
              <td className="px-4 py-3 text-xs">
                <p className="font-bold text-slate-800">{m.courier_name || "-"}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Security: {m.security_name || "-"}</p>
              </td>
              <td className="px-4 py-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-emerald-600 text-sm">{handed - disc}</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-600 font-semibold">{handed}</span>
                  {disc > 0 && (
                    <span
                      title={`${disc} paket discrepancy`}
                      className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-bold ml-1"
                    >
                      {disc}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                {formatDateTime(m.signed_at)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/manifest/${m.id}`}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Lihat Detail"
                    aria-label={`Lihat detail manifest ${m.session_code}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleExportExcel(m.id)}
                    disabled={exportingId === m.id}
                    className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Export Excel"
                    aria-label={`Export Excel manifest ${m.session_code}`}
                  >
                    <Download className={`w-3.5 h-3.5 ${exportingId === m.id ? "animate-pulse" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(`/print/manifest/${m.id}`, "_blank", "noopener")}
                    className="p-2 text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"
                    title="Print"
                    aria-label={`Print manifest ${m.session_code}`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </TableShell>
    </div>
  );
}