"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import showToast from "@/lib/toast";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Truck as TruckIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  Package,
  Weight,
  DollarSign,
  Power,
  PowerOff,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";

// =====================================================================
// TYPES
// =====================================================================
interface EkspedisiData {
  id: number;
  vendor_name: string;
  weight_price: number;
  volume_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  vendor_name: "",
  weight_price: 0,
  volume_price: 0,
  is_active: true,
};

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

// =====================================================================
// SMALL COMPONENTS
// =====================================================================
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: "blue" | "indigo" | "emerald" | "amber";
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="truncate text-xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        Aktif
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
      <PowerOff className="h-3 w-3" />
      Nonaktif
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: any;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[#0B2B4A] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#123a5e]"
        >
          <Plus className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-3 rounded bg-slate-100" />
        </td>
      ))}
    </tr>
  );
}

// =====================================================================
// PAGE
// =====================================================================
export default function MasterEkspedisiPage() {
  const [data, setData] = useState<EkspedisiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal add/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<EkspedisiData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────
  const fetchData = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q
        ? `/api/admin/master/ekspedisi?q=${encodeURIComponent(q)}`
        : `/api/admin/master/ekspedisi`;
      const res = await fetch(url, { cache: "no-store" });
      const result = await res.json();
      if (res.ok && result.success) {
        setData(result.data || []);
      } else {
        showToast.error(result.message || "Gagal memuat data ekspedisi");
      }
    } catch (error) {
      console.error("Error fetching ekspedisi:", error);
      showToast.error("Error memuat data ekspedisi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(search.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchData]);

  // ─── Pagination logic ────────────────────────────────────
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((d) => d.vendor_name.toLowerCase().includes(q));
  }, [data, search]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // ─── Stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = data.length;
    const active = data.filter((d) => d.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [data]);

  // ─── CRUD ──────────────────────────────────────────────
  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEditModal = (item: EkspedisiData) => {
    setEditingId(item.id);
    setForm({
      vendor_name: item.vendor_name || "",
      weight_price: item.weight_price || 0,
      volume_price: item.volume_price || 0,
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleSave = async () => {
    if (!form.vendor_name.trim()) {
      showToast.error("Vendor Name wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const isEdit = editingId !== null;
      const url = isEdit
        ? `/api/admin/master/ekspedisi/${editingId}`
        : `/api/admin/master/ekspedisi`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_name: form.vendor_name.trim(),
          weight_price: form.weight_price || 0,
          volume_price: form.volume_price || 0,
          is_active: form.is_active,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast.success(result.message);
        setModalOpen(false);
        setEditingId(null);
        setForm({ ...emptyForm });
        fetchData(search.trim());
      } else {
        showToast.error(result.message || "Gagal menyimpan ekspedisi");
      }
    } catch (error) {
      console.error("Error saving ekspedisi:", error);
      showToast.error("Error menyimpan ekspedisi");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/master/ekspedisi/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      const result = await res.json();

      if (res.ok && result.success) {
        showToast.success(result.message);
        setDeleteTarget(null);
        fetchData(search.trim());
      } else {
        showToast.error(result.message || "Gagal menghapus ekspedisi");
      }
    } catch (error) {
      console.error("Error deleting ekspedisi:", error);
      showToast.error("Error menghapus ekspedisi");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Export Excel ──────────────────────────────────────
  const exportExcel = () => {
    if (data.length === 0) {
      showToast.info("Tidak ada data untuk di-export");
      return;
    }

    const dataToExport = data.map((d) => ({
      "Vendor Name": d.vendor_name,
      "Weight Price": d.weight_price,
      "Volume Price": d.volume_price,
      Status: d.is_active ? "Aktif" : "Nonaktif",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws["!cols"] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Ekspedisi");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `master_ekspedisi_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── Pagination Render Helper ──────────────────────────
  const getPageNumbers = (
    current: number,
    total: number
  ): (number | "...")[] => {
    const delta = 1;
    const range: (number | "...")[] = [];
    const rangeStart = Math.max(2, current - delta);
    const rangeEnd = Math.min(total - 1, current + delta);

    range.push(1);
    if (rangeStart > 2) range.push("...");
    for (let i = rangeStart; i <= rangeEnd; i++) range.push(i);
    if (rangeEnd < total - 1) range.push("...");
    if (total > 1) range.push(total);

    return range;
  };

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">
        {/* ============================================================= */}
        {/* HEADER                                                         */}
        {/* ============================================================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                Master Ekspedisi
              </h1>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-blue-200">
                Master
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Kelola data vendor / ekspedisi beserta harga
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B2B4A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#123a5e]"
            >
              <Plus className="h-4 w-4" />
              Tambah Ekspedisi
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* STATS                                                          */}
        {/* ============================================================= */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            icon={TruckIcon}
            label="Total Vendor"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={Power}
            label="Aktif"
            value={stats.active}
            color="emerald"
          />
          <StatCard
            icon={PowerOff}
            label="Nonaktif"
            value={stats.inactive}
            color="amber"
          />
        </div>

        {/* ============================================================= */}
        {/* TOOLBAR                                                        */}
        {/* ============================================================= */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari vendor ekspedisi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-slate-500">Tampilkan</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <button
              onClick={() => fetchData(search.trim())}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* MAIN CARD                                                      */}
        {/* ============================================================= */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Vendor Name
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Weight Price
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Volume Price
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <>
                    <SkeletonRow cols={5} />
                    <SkeletonRow cols={5} />
                    <SkeletonRow cols={5} />
                  </>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={TruckIcon}
                        title={
                          search
                            ? "Tidak ada hasil pencarian"
                            : "Belum ada data ekspedisi"
                        }
                        description={
                          search
                            ? "Coba ubah kata kunci pencarian Anda."
                            : "Mulai dengan menambahkan vendor ekspedisi pertama."
                        }
                        actionLabel={
                          !search ? "Tambah Ekspedisi" : undefined
                        }
                        onAction={!search ? openAddModal : undefined}
                      />
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item) => (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                            <TruckIcon className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-semibold text-slate-800">
                            {item.vendor_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-sm text-slate-700">
                          {Number(item.weight_price).toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-sm text-slate-700">
                          {Number(item.volume_price).toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge isActive={item.is_active} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination */}
          {!loading && totalItems > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
              <span className="text-xs text-slate-500">
                Menampilkan{" "}
                <span className="font-semibold">
                  {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalItems)}
                </span>{" "}
                dari <span className="font-semibold">{totalItems}</span> ekspedisi
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 text-sm text-slate-400"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        p === currentPage
                          ? "bg-[#0B2B4A] text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* MODAL: ADD / EDIT                                              */}
      {/* ============================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <TruckIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editingId !== null
                      ? "Edit Ekspedisi"
                      : "Tambah Ekspedisi"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingId !== null
                      ? "Perbarui data vendor"
                      : "Daftarkan vendor baru"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Section: Vendor */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Package className="h-3.5 w-3.5" />
                  Info Vendor
                </h4>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Vendor Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.vendor_name}
                    onChange={(e) =>
                      setForm({ ...form, vendor_name: e.target.value })
                    }
                    placeholder="Contoh: PT. Ekspedisi Jaya"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                  />
                </div>
              </div>

              {/* Section: Harga */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <DollarSign className="h-3.5 w-3.5" />
                  Harga
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      <Weight className="mr-1 inline h-3 w-3" />
                      Weight Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.weight_price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          weight_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      <Boxes className="mr-1 inline h-3 w-3" />
                      Volume Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.volume_price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          volume_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Status */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Power className="h-3.5 w-3.5" />
                  Status
                </h4>

                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, is_active: !form.is_active })
                  }
                  className={`flex w-full items-center justify-between rounded-xl border p-3 transition-colors ${
                    form.is_active
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        form.is_active
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {form.is_active ? (
                        <Power className="h-4 w-4" />
                      ) : (
                        <PowerOff className="h-4 w-4" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-800">
                        {form.is_active ? "Aktif" : "Nonaktif"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {form.is_active
                          ? "Vendor dapat digunakan"
                          : "Vendor tidak akan muncul di pilihan"}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      form.is_active ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        form.is_active ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-[#0B2B4A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#123a5e] disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : editingId !== null ? "Simpan Perubahan" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: DELETE CONFIRM                                          */}
      {/* ============================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-col items-center gap-3 px-6 pt-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
                <AlertTriangle className="h-7 w-7 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Hapus Ekspedisi?
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Vendor{" "}
                  <span className="font-semibold text-slate-700">
                    {deleteTarget.vendor_name}
                  </span>{" "}
                  akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
                </p>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// ICON: Boxes (missing import fallback)
// =====================================================================
function Boxes(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
      <path d="m7 16.5-4.74-2.85" />
      <path d="m7 16.5 5-3" />
      <path d="M7 16.5v5.17" />
      <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
      <path d="m17 16.5-5-3" />
      <path d="m17 16.5 4.74-2.85" />
      <path d="M17 16.5v5.17" />
      <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
      <path d="M12 8 7.26 5.15" />
      <path d="m12 8 4.74-2.85" />
      <path d="M12 13.5V8" />
    </svg>
  );
}