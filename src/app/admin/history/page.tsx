"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { showToast } from "@/lib/toast";

interface HistoryLog {
  id: string;
  session_id: string;
  session_code: string;
  transporter_name: string;
  resi_number: string;
  sorting_at: string;
  sorting_by: string;
  handover_at: string;
  handover_by: string;
  status: string;
  is_instant: boolean;
  location_code: string | null;
  putaway_by: string | null;
  picked_by: string | null;
}

interface Stats {
  total: number;
  done: number;
  cancelled: number;
  not_found: number;
  instant: number;
  regular: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterInstant, setFilterInstant] = useState<"all" | "instant" | "regular">("all");
  const [limit, setLimit] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/admin/history?page=${currentPage}&limit=${limit}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      if (filterInstant === "instant") {
        url += `&is_instant=true`;
      } else if (filterInstant === "regular") {
        url += `&is_instant=false`;
      }

      const res = await fetch(url);
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
  }, [currentPage, limit, searchTerm, filterInstant]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Reset ke halaman 1 saat filter/search berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterInstant, limit]);

  const handleExportCSV = () => {
    if (history.length === 0) {
      showToast.warning("Tidak ada data untuk diexport");
      return;
    }

    const headers = [
      "No",
      "Session Code",
      "Transporter",
      "Resi Number",
      "Status",
      "Type",
      "Location",
      "Sorting By",
      "Handover By",
      "Handover At"
    ];

    const rows = history.map((h, index) => [
      ((currentPage - 1) * limit) + index + 1,
      h.session_code,
      h.transporter_name,
      h.resi_number,
      h.status,
      h.is_instant ? "INSTANT" : "REGULAR",
      h.location_code || "-",
      h.sorting_by || "-",
      h.handover_by || "-",
      new Date(h.handover_at).toLocaleString('id-ID')
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `history-logs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast.success("CSV berhasil didownload");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-medium"><CheckCircle className="w-3 h-3" /> Done</span>;
      case 'CANCELLED':
        return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full text-xs font-medium"><AlertCircle className="w-3 h-3" /> Cancel</span>;
      case 'NOT_FOUND':
        return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium"><XCircle className="w-3 h-3" /> Not Found</span>;
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  // 🔥 PAGINATION CONTROLS
  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const { page, totalPages, hasPrev, hasNext } = pagination;
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          Menampilkan {((page - 1) * pagination.limit) + 1} - {Math.min(page * pagination.limit, pagination.total)} dari {pagination.total} data
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(page - 1)}
            disabled={!hasPrev}
            className={`p-2 rounded-lg text-sm transition-colors ${
              hasPrev 
                ? "hover:bg-slate-200 text-slate-700" 
                : "text-slate-300 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {startPage > 1 && (
            <>
              <button
                onClick={() => setCurrentPage(1)}
                className="px-3 py-1 rounded-lg text-sm hover:bg-slate-200 transition-colors"
              >
                1
              </button>
              {startPage > 2 && <span className="px-2 text-slate-400">...</span>}
            </>
          )}
          
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                p === page
                  ? "bg-[#0B2B4A] text-white"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              {p}
            </button>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-2 text-slate-400">...</span>}
              <button
                onClick={() => setCurrentPage(totalPages)}
                className="px-3 py-1 rounded-lg text-sm hover:bg-slate-200 transition-colors"
              >
                {totalPages}
              </button>
            </>
          )}
          
          <button
            onClick={() => setCurrentPage(page + 1)}
            disabled={!hasNext}
            className={`p-2 rounded-lg text-sm transition-colors ${
              hasNext 
                ? "hover:bg-slate-200 text-slate-700" 
                : "text-slate-300 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">History Logs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Riwayat semua aktivitas sorting & handover
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={fetchHistory}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari resi, session code, atau transporter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterInstant("all")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterInstant === "all" 
                  ? "bg-[#0B2B4A] text-white" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterInstant("instant")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterInstant === "instant" 
                  ? "bg-blue-600 text-white" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Instant
            </button>
            <button
              onClick={() => setFilterInstant("regular")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterInstant === "regular" 
                  ? "bg-orange-600 text-white" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Regular
            </button>
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
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
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#0B2B4A] border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500 text-sm">
                    {searchTerm ? "Tidak ada data yang sesuai" : "Belum ada history logs"}
                  </td>
                </tr>
              ) : (
                history.map((h, index) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 text-sm text-slate-500">
                      {((currentPage - 1) * limit) + index + 1}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-sm font-medium text-slate-800">
                        {h.session_code}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-sm text-slate-600">
                        {h.resi_number}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {h.transporter_name}
                    </td>
                    <td className="px-4 py-2">
                      {getStatusBadge(h.status)}
                    </td>
                    <td className="px-4 py-2">
                      {h.is_instant ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          Instant
                        </span>
                      ) : (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                          Regular
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-sm font-mono text-blue-600">
                        {h.location_code || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {h.handover_by || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-500">
                      {new Date(h.handover_at).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 🔥 PAGINATION */}
        {renderPagination()}
      </div>
    </div>
  );
}