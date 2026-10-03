"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import showToast from "@/lib/toast";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Store as StoreIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Building2,
  MapPinned,
  Power,
  PowerOff,
  RefreshCw,
  AlertTriangle,
  Tag,
} from "lucide-react";
import * as XLSX from "xlsx";

// =====================================================================
// TYPES
// =====================================================================
interface StoreData {
  id: number;
  site: string;
  store_name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  brand: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  site: "",
  store_name: "",
  address: "",
  city: "",
  province: "",
  brand: "",
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
export default function MasterStorePage() {
  const [stores, setStores] = useState<StoreData[]>([]);
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
  const [deleteTarget, setDeleteTarget] = useState<StoreData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────
  const fetchStores = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q
        ? `/api/admin/master/store?q=${encodeURIComponent(q)}`
        : `/api/admin/master/store`;
      const res = await fetch(url, { cache: "no-store" });
      const result = await res.json();
      if (res.ok && result.success) {
        setStores(result.data || []);
      } else {
        showToast.error(result.message || "Gagal memuat data store");
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      showToast.error("Error memuat data store");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStores(search.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchStores]);

  // ─── Pagination logic ────────────────────────────────────
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.site.toLowerCase().includes(q) ||
        s.store_name.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q))
    );
  }, [stores, search]);

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
    const total = stores.length;
    const active = stores.filter((s) => s.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [stores]);

  // ─── CRUD ──────────────────────────────────────────────
  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEditModal = (store: StoreData) => {
    setEditingId(store.id);
    setForm({
      site: store.site || "",
      store_name: store.store_name || "",
      address: store.address || "",
      city: store.city || "",
      province: store.province || "",
      brand: store.brand || "",
      is_active: store.is_active,
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
    if (!form.site.trim() || !form.store_name.trim()) {
      showToast.error("Site dan Store Name wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const isEdit = editingId !== null;
      const url = isEdit
        ? `/api/admin/master/store/${editingId}`
        : `/api/admin/master/store`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: form.site.trim().toUpperCase(),
          store_name: form.store_name.trim(),
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          province: form.province.trim() || null,
          brand: form.brand.trim() || null,
          is_active: form.is_active,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast.success(result.message);
        setModalOpen(false);
        setEditingId(null);
        setForm({ ...emptyForm });
        fetchStores(search.trim());
      } else {
        showToast.error(result.message || "Gagal menyimpan store");
      }
    } catch (error) {
      console.error("Error saving store:", error);
      showToast.error("Error menyimpan store");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/master/store/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      const result = await res.json();

      if (res.ok && result.success) {
        showToast.success(result.message);
        setDeleteTarget(null);
        fetchStores(search.trim());
      } else {
        showToast.error(result.message || "Gagal menghapus store");
      }
    } catch (error) {
      console.error("Error deleting store:", error);
      showToast.error("Error menghapus store");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Export Excel ──────────────────────────────────────
  const exportExcel = () => {
    if (stores.length === 0) {
      showToast.info("Tidak ada data untuk di-export");
      return;
    }

    const dataToExport = stores.map((s) => ({
      Site: s.site,
      "Store Name": s.store_name,
      Brand: s.brand || "",
      Address: s.address || "",
      City: s.city || "",
      Province: s.province || "",
      Status: s.is_active ? "Aktif" : "Nonaktif",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 30 },
      { wch: 15 },
      { wch: 40 },
      { wch: 20 },
      { wch: 20 },
      { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Store");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `master_store_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── Pagination Helper ─────────────────────────────────
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
                Master Store
              </h1>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-blue-200">
                Master
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Kelola data site / toko untuk operasi B2B
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
              Tambah Store
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* STATS                                                          */}
        {/* ============================================================= */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            icon={StoreIcon}
            label="Total Store"
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
              placeholder="Cari site, nama toko, atau kota..."
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
              onClick={() => fetchStores(search.trim())}
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
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="w-[110px] px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Site
                  </th>
                  <th className="w-[300px] px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Store
                  </th>
                  <th className="w-[120px] px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Brand
                  </th>
                  <th className="w-[180px] px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Lokasi
                  </th>
                  <th className="w-[110px] px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="w-[100px] px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              ...
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <>
                    <SkeletonRow cols={6} />
                    <SkeletonRow cols={6} />
                    <SkeletonRow cols={6} />
                  </>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={StoreIcon}
                        title={
                          search
                            ? "Tidak ada hasil pencarian"
                            : "Belum ada data store"
                        }
                        description={
                          search
                            ? "Coba ubah kata kunci pencarian Anda."
                            : "Mulai dengan menambahkan store pertama Anda."
                        }
                        actionLabel={!search ? "Tambah Store" : undefined}
                        onAction={!search ? openAddModal : undefined}
                      />
                    </td>
                  </tr>
                ) : (
                  currentItems.map((store) => (
                    <tr
                      key={store.id}
                      className="group transition-colors hover:bg-slate-50/60"
                    >
                      {/* Site */}
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-800">
                          {store.site}
                        </span>
                      </td>

                      {/* Store */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                            <StoreIcon className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {store.store_name}
                            </p>
                            {store.address && (
                              <p
                                className="mt-0.5 break-words text-[11px] leading-snug text-slate-500 line-clamp-2"
                                title={store.address}
                              >
                                {store.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="px-5 py-4">
                        {store.brand ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                            <Tag className="h-2.5 w-2.5" />
                            {store.brand}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Lokasi */}
                      <td className="px-5 py-4">
                        {store.city || store.province ? (
                          <div className="flex flex-col gap-0.5">
                            {store.city && (
                              <span className="flex items-center gap-1 text-xs text-slate-700">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {store.city}
                              </span>
                            )}
                            {store.province && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                <MapPinned className="h-3 w-3 text-slate-400" />
                                {store.province}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <StatusBadge isActive={store.is_active} />
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(store)}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(store)}
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
                  {startIndex + 1}–
                  {Math.min(startIndex + itemsPerPage, totalItems)}
                </span>{" "}
                dari <span className="font-semibold">{totalItems}</span> store
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
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <StoreIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editingId !== null ? "Edit Store" : "Tambah Store"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingId !== null
                      ? "Perbarui data store"
                      : "Daftarkan store baru"}
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
              {/* Section: Identitas */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Building2 className="h-3.5 w-3.5" />
                  Identitas Store
                </h4>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Site <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.site}
                        onChange={(e) =>
                          setForm({ ...form, site: e.target.value })
                        }
                        placeholder="ST00002"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm uppercase focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Brand
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        value={form.brand}
                        onChange={(e) =>
                          setForm({ ...form, brand: e.target.value })
                        }
                        placeholder="Bodypack"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Store Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.store_name}
                      onChange={(e) =>
                        setForm({ ...form, store_name: e.target.value })
                      }
                      placeholder="Nama toko"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Alamat */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  Alamat
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Alamat Lengkap
                    </label>
                    <textarea
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      rows={2}
                      placeholder="JL. Contoh No. 123"
                      className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Kota
                      </label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) =>
                          setForm({ ...form, city: e.target.value })
                        }
                        placeholder="Bandung"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Provinsi
                      </label>
                      <input
                        type="text"
                        value={form.province}
                        onChange={(e) =>
                          setForm({ ...form, province: e.target.value })
                        }
                        placeholder="Jawa Barat"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                      />
                    </div>
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
                          ? "Store dapat digunakan di operasi B2B"
                          : "Store tidak akan muncul di pilihan"}
                      </p>
                    </div>
                  </div>

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
                {saving
                  ? "Menyimpan..."
                  : editingId !== null
                  ? "Simpan Perubahan"
                  : "Tambah Store"}
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
                  Hapus Store?
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Store{" "}
                  <span className="font-mono font-semibold text-slate-700">
                    {deleteTarget.site}
                  </span>{" "}
                  —{" "}
                  <span className="font-semibold text-slate-700">
                    {deleteTarget.store_name}
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