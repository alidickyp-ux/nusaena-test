"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import showToast from "@/lib/toast";
import { Plus, Pencil, Trash2, Search, X, Store as StoreIcon, Download, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";

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
      const url = q ? `/api/admin/master/store?q=${encodeURIComponent(q)}` : `/api/admin/master/store`;
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
    return stores.filter(s =>
      s.site.toLowerCase().includes(q) ||
      s.store_name.toLowerCase().includes(q) ||
      (s.city && s.city.toLowerCase().includes(q))
    );
  }, [stores, search]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

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
      const url = isEdit ? `/api/admin/master/store/${editingId}` : `/api/admin/master/store`;
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
      const res = await fetch(`/api/admin/master/store/${deleteTarget.id}`, {
        method: "DELETE",
      });
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

  // ─── Export Excel (XLSX) ──────────────────────────────
  const exportExcel = () => {
    if (stores.length === 0) {
      showToast.info("Tidak ada data untuk di-export");
      return;
    }

    // Siapkan data dalam bentuk array of objects (sesuai header)
    const dataToExport = stores.map(s => ({
      Site: s.site,
      "Store Name": s.store_name,
      Brand: s.brand || "",
      Address: s.address || "",
      City: s.city || "",
      Province: s.province || "",
      Status: s.is_active ? "Aktif" : "Nonaktif",
    }));

    // Buat worksheet
    const ws = XLSX.utils.json_to_sheet(dataToExport);

    // Atur lebar kolom (opsional)
    const colWidths = [
      { wch: 12 }, // Site
      { wch: 30 }, // Store Name
      { wch: 15 }, // Brand
      { wch: 40 }, // Address
      { wch: 20 }, // City
      { wch: 20 }, // Province
      { wch: 10 }, // Status
    ];
    ws['!cols'] = colWidths;

    // Buat workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Store");

    // Generate file XLSX (binary array)
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    // Buat Blob dan download
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `master_store_${new Date().toISOString().slice(0,10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Master Store</h2>
          <p className="text-xs text-slate-400">Kelola data site / toko untuk operasi B2B</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B2B4A] hover:bg-[#123a63] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Store
          </button>
        </div>
      </div>

      {/* Search & Pagination controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari site, nama toko, atau kota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Tampilkan</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {ITEMS_PER_PAGE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Store Name</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Alamat</th>
                <th className="px-4 py-3">Kota</th>
                <th className="px-4 py-3">Provinsi</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span>Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <StoreIcon className="w-8 h-8 text-slate-300" />
                      <span>{search ? "Tidak ada hasil pencarian" : "Belum ada data store"}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((store) => (
                  <tr key={store.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{store.site}</td>
                    <td className="px-4 py-3 text-slate-700">{store.store_name}</td>
                    <td className="px-4 py-3 text-slate-500">{store.brand || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[220px] truncate" title={store.address || ""}>
                      {store.address || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{store.city || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{store.province || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                          store.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {store.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(store)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(store)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with pagination */}
        {!loading && totalItems > 0 && (
          <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400 gap-2">
            <div>
              Menampilkan {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} store
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700">
                Halaman {currentPage} dari {totalPages || 1}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL ADD/EDIT ────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-bold text-slate-800">
                {editingId !== null ? "Edit Store" : "Tambah Store"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Site <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.site}
                  onChange={(e) => setForm({ ...form, site: e.target.value })}
                  placeholder="Contoh: ST00002"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Store Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.store_name}
                  onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                  placeholder="Nama toko"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="Contoh: Bodypack"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Alamat
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Kota
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Provinsi
                  </label>
                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                />
                <span className="text-sm text-slate-700">Store aktif</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#0B2B4A] hover:bg-[#123a63] rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM ────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5">
            <h3 className="font-bold text-slate-800 mb-1">Hapus Store?</h3>
            <p className="text-sm text-slate-500 mb-4">
              Store <span className="font-mono font-semibold text-slate-700">{deleteTarget.site}</span> —{" "}
              {deleteTarget.store_name} akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
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