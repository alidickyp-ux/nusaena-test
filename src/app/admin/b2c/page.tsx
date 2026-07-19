"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  List,
  FileText,
  Activity,
  Zap,
  Package,
} from "lucide-react";
import { showToast } from "@/lib/toast";

// =========================================================
// Tipe data
// =========================================================
interface HistoryLog {
  id: string;
  session_code: string;
  transporter_name: string;
  resi_number: string;
  handover_at: string;
  handover_by: string;
  status: string;
  is_instant: boolean;
  location_code: string | null;
}

interface HistoryStats {
  total: number;
  done: number;
  cancelled: number;
  not_found: number;
  instant: number;
  regular: number;
}

interface Manifest {
  id: string;
  session_code: string;
  transporter_name: string;
  courier_name: string;
  security_name: string;
  total_packages_handed: number;
  total_discrepancy: number;
  signed_at: string;
}

    interface SortingDetail {
  id: string;
  barcode_resi: string;
  scanned_at: string;
  is_validated_handover: boolean;
  discrepancy_reason: string | null;
  validated_at: string | null;
  session_code: string;
  session_status: string;
  transporter_name: string;
  source_type: "sorting" | "instant";
  instant_status?: "STORED" | "PICKED" | null;
}

interface SortingStats {
  total: number;
  handed_over: number;
  pending: number;
  discrepancy: number;
  in_running_session: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type TabKey = "sorting" | "manifest" | "history";

// =========================================================
// Komponen kecil dipakai bersama
// =========================================================
function PaginationBar({
  pagination,
  onPageChange,
}: {
  pagination: Pagination | null;
  onPageChange: (page: number) => void;
}) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, hasPrev, hasNext, limit, total } = pagination;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
      <div className="text-xs text-slate-500">
        Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} dari {total} data
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          className={`p-2 rounded-lg text-sm transition-colors ${
            hasPrev ? "hover:bg-slate-200 text-slate-700" : "text-slate-300 cursor-not-allowed"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-500 px-2">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className={`p-2 rounded-lg text-sm transition-colors ${
            hasNext ? "hover:bg-slate-200 text-slate-700" : "text-slate-300 cursor-not-allowed"
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// =========================================================
// TAB: Sorting Session (monitoring sorting_details + instant_packages)
// =========================================================
function SortingSessionTab() {
  const [rows, setRows] = useState<SortingDetail[]>([]);
  const [stats, setStats] = useState<SortingStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "closed">("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/admin/sorting-details?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter !== "all") url += `&session_status=${statusFilter}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRows(data.data || []);
        setStats(data.stats || null);
        setPagination(data.pagination || null);
      } else {
        const errorData = await res.json();
        showToast.error(errorData.message || "Gagal memuat data sorting");
      }
    } catch (error) {
      console.error("Error fetching sorting details:", error);
      showToast.error("Error fetching sorting details");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // Helper untuk render badge source
  const renderSourceBadge = (sourceType: string) => {
    if (sourceType === "instant") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
          <Zap className="w-3 h-3" />
          Instant
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
        <Package className="w-3 h-3" />
        Regular
      </span>
    );
  };

  // Helper untuk render status handover
  const renderHandoverStatus = (row: SortingDetail) => {
  if (row.discrepancy_reason) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
        <AlertCircle className="w-3 h-3" /> {row.discrepancy_reason}
      </span>
    );
  }
  
  if (row.source_type === "instant") {
    if (row.instant_status === "PICKED") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
          <CheckCircle className="w-3 h-3" /> Sudah
        </span>
      );
    }
    return (
      <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
        Belum
      </span>
    );
  }
  
  if (row.is_validated_handover) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" /> Sudah
      </span>
    );
  }
  
  return (
    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
      Belum
    </span>
  );
};

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 -mt-1">
        Pantau semua paket B2C — baik dari <strong>sorting regular</strong> maupun 
        <strong> instant</strong> yang sudah di-scan. Status <strong>PICKED</strong> = sudah handover,
        <strong> STORED</strong> = belum handover.
      </p>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
            <p className="text-xl font-bold text-slate-800">{stats.total || 0}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Scan</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center">
            <p className="text-xl font-bold text-emerald-600">{stats.handed_over || 0}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Sudah Handover</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-amber-200 text-center">
            <p className="text-xl font-bold text-amber-600">{stats.pending || 0}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Belum Handover</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-red-200 text-center">
            <p className="text-xl font-bold text-red-600">{stats.discrepancy || 0}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Discrepancy</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-blue-200 text-center">
            <p className="text-xl font-bold text-blue-600">{stats.in_running_session || 0}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Di Sesi Running</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor resi, session code, atau transporter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "running", "closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                statusFilter === s
                  ? "bg-[#0B2B4A] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "all" ? "Semua Sesi" : s === "running" ? "Running" : "Closed"}
            </button>
          ))}
        </div>
        <button
          onClick={fetchData}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Session</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transporter</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sesi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Handover</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Scanned At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#0B2B4A] border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                    {search ? "Tidak ada resi yang cocok" : "Belum ada data sorting"}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2">
                      <span className="font-mono text-sm font-semibold text-slate-800">{r.barcode_resi}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs text-slate-600">{r.session_code}</span>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">{r.transporter_name || "-"}</td>
                    <td className="px-4 py-2">
                      {renderSourceBadge(r.source_type)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          r.session_status === "RUNNING"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {r.session_status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {renderHandoverStatus(r)}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {new Date(r.scanned_at).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}

// =========================================================
// TAB: Handover Manifest (existing, dipindah dari /admin/manifest)
// =========================================================
function ManifestTab() {
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchManifests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manifest", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setManifests(data.data || []);
      } else {
        showToast.error("Gagal memuat data manifest");
      }
    } catch (error) {
      showToast.error("Error fetching manifests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManifests();
  }, [fetchManifests]);

  const filtered = manifests.filter(
    (m) =>
      m.session_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.transporter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.courier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = async (id: string) => {
    try {
      const res = await fetch(`/api/manifest/${id}/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `manifest-${id}.xlsx`;
        a.click();
        showToast.success("Excel berhasil didownload");
      }
    } catch (error) {
      showToast.error("Gagal export excel");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari manifest (session code, transporter, kurir)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
          />
        </div>
        <button
          onClick={fetchManifests}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Session Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transporter</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kurir / Security</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Paket / Discrepancy</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#0B2B4A] border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                    {searchTerm ? "Tidak ada manifest yang sesuai" : "Belum ada manifest"}
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-slate-800">{m.session_code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.transporter_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-medium text-slate-800">{m.courier_name}</p>
                      <p className="text-xs text-slate-500">Security: {m.security_name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600">
                          {m.total_packages_handed - m.total_discrepancy}
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-600">{m.total_packages_handed}</span>
                        {m.total_discrepancy > 0 && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            {m.total_discrepancy} discrepancy
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(m.signed_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/manifest/${m.id}`}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleExportExcel(m.id)}
                          className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                          title="Export Excel"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.open(`/print/manifest/${m.id}`, "_blank")}
                          className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// TAB: History Logs (existing, dipindah dari /admin/history)
// =========================================================
function HistoryTab() {
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterInstant, setFilterInstant] = useState<"all" | "instant" | "regular">("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/admin/history?page=${page}&limit=${limit}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterInstant === "instant") url += `&is_instant=true`;
      else if (filterInstant === "regular") url += `&is_instant=false`;

      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.data || []);
        setStats(data.stats || null);
        setPagination(data.pagination || null);
      } else {
        showToast.error("Gagal memuat data history");
      }
    } catch (error) {
      showToast.error("Error fetching history");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterInstant]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterInstant]);

  const handleExportCSV = () => {
    if (history.length === 0) {
      showToast.warning("Tidak ada data untuk diexport");
      return;
    }
    const headers = ["Session Code", "Transporter", "Resi Number", "Status", "Type", "Location", "Handover By", "Handover At"];
    const rows = history.map((h) => [
      h.session_code,
      h.transporter_name,
      h.resi_number,
      h.status,
      h.is_instant ? "INSTANT" : "REGULAR",
      h.location_code || "-",
      h.handover_by || "-",
      new Date(h.handover_at).toLocaleString("id-ID"),
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `history-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast.success("CSV berhasil didownload");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DONE":
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-medium w-fit"><CheckCircle className="w-3 h-3" /> Done</span>;
      case "CANCELLED":
        return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full text-xs font-medium w-fit"><AlertCircle className="w-3 h-3" /> Cancel</span>;
      case "NOT_FOUND":
        return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium w-fit"><XCircle className="w-3 h-3" /> Not Found</span>;
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
            <p className="text-xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
            <p className="text-xl font-bold text-emerald-600">{stats.done}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Done</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
            <p className="text-xl font-bold text-yellow-600">{stats.cancelled}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Cancel</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
            <p className="text-xl font-bold text-red-600">{stats.not_found}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Not Found</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-blue-200 text-center">
            <p className="text-xl font-bold text-blue-600">{stats.instant}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Instant</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-orange-200 text-center">
            <p className="text-xl font-bold text-orange-600">{stats.regular}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Regular</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari resi, session code, atau transporter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "instant", "regular"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterInstant(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterInstant === f ? "bg-[#0B2B4A] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f === "all" ? "Semua" : f === "instant" ? "Instant" : "Regular"}
            </button>
          ))}
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Session Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resi Number</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transporter</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Handover By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#0B2B4A] border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">
                    {searchTerm ? "Tidak ada data yang sesuai" : "Belum ada history logs"}
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2">
                      <span className="font-mono text-sm font-medium text-slate-800">{h.session_code}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-sm text-slate-600">{h.resi_number}</span>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">{h.transporter_name}</td>
                    <td className="px-4 py-2">{getStatusBadge(h.status)}</td>
                    <td className="px-4 py-2">
                      {h.is_instant ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Instant</span>
                      ) : (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Regular</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-sm font-mono text-blue-600">{h.location_code || "-"}</span>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">{h.handover_by || "-"}</td>
                    <td className="px-4 py-2 text-sm text-slate-500">
                      {new Date(h.handover_at).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}

// =========================================================
// PAGE UTAMA — 3 tab, mengikuti pola halaman B2B
// =========================================================
export default function B2CAdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("sorting");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Operasional B2C</h1>
        <p className="text-sm text-slate-500 mt-1">
          Sorting session, handover manifest, dan history logs — semua dalam satu halaman.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("sorting")}
              className={`px-6 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === "sorting"
                  ? "text-[#0B2B4A] border-b-2 border-[#0B2B4A]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Activity className="w-4 h-4" />
              Sorting Session
            </button>
            <button
              onClick={() => setActiveTab("manifest")}
              className={`px-6 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === "manifest"
                  ? "text-[#0B2B4A] border-b-2 border-[#0B2B4A]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <List className="w-4 h-4" />
              Handover Manifest
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-6 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === "history"
                  ? "text-[#0B2B4A] border-b-2 border-[#0B2B4A]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText className="w-4 h-4" />
              History Logs
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeTab === "sorting" && <SortingSessionTab />}
          {activeTab === "manifest" && <ManifestTab />}
          {activeTab === "history" && <HistoryTab />}
        </div>
      </div>
    </div>
  );
}