"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import showToast from "@/lib/toast";
import { Plus, Pencil, Trash2, Search, X, Truck as TruckIcon, Download, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";

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
      const url = q ? `/api/admin/master/ekspedisi?q=${encodeURIComponent(q)}` : `/api/admin/master/ekspedisi`;
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
    return data.filter(d => d.vendor_name.toLowerCase().includes(q));
  }, [data, search]);

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
      const url = isEdit ? `/api/admin/master/ekspedisi/${editingId}` : `/api/admin/master/ekspedisi`;
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
      const res = await fetch(`/api/admin/master/ekspedisi/${deleteTarget.id}`, {
        method: "DELETE",
      });
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

  // ─── Export Excel (XLSX) ──────────────────────────────
  const exportExcel = () => {
    if (data.length === 0) {
      showToast.info("Tidak ada data untuk di-export");
      return;
    }

    const dataToExport = data.map(d => ({
      "Vendor Name": d.vendor_name,
      "Weight Price": d.weight_price,
      "Volume Price": d.volume_price,
      Status: d.is_active ? "Aktif" : "Nonaktif",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [
      { wch: 30 }, // Vendor Name
      { wch: 15 }, // Weight Price
      { wch: 15 }, // Volume Price
      { wch: 10 }, // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Ekspedisi");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `master_ekspedisi_${new Date().toISOString().slice(0,10)}.xlsx`);
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
          <h2 className="text-lg font-bold text-slate-800">Master Ekspedisi</h2>
          <p className="text-xs text-slate-400">Kelola data vendor / ekspedisi</p>
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
            Tambah Ekspedisi
          </button>
        </div>
      </div>

      {/* Search & Pagination controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari vendor ekspedisi..."
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
                <th className="px-4 py-3">Vendor Name</th>
                <th className="px-4 py-3">Weight Price</th>
                <th className="px-4 py-3">Volume Price</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span>Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <TruckIcon className="w-8 h-8 text-slate-300" />
                      <span>{search ? "Tidak ada hasil pencarian" : "Belum ada data ekspedisi"}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{item.vendor_name}</td>
                    <td className="px-4 py-3 text-slate-700">{item.weight_price}</td>
                    <td className="px-4 py-3 text-slate-700">{item.volume_price}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                          item.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
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
              Menampilkan {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} ekspedisi
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
                {editingId !== null ? "Edit Ekspedisi" : "Tambah Ekspedisi"}
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
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.vendor_name}
                  onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                  placeholder="Contoh: PT. Ekspedisi Jaya"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Weight Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.weight_price}
                    onChange={(e) => setForm({ ...form, weight_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Volume Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.volume_price}
                    onChange={(e) => setForm({ ...form, volume_price: parseFloat(e.target.value) || 0 })}
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
                <span className="text-sm text-slate-700">Aktif</span>
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
            <h3 className="font-bold text-slate-800 mb-1">Hapus Ekspedisi?</h3>
            <p className="text-sm text-slate-500 mb-4">
              Vendor <span className="font-semibold text-slate-700">{deleteTarget.vendor_name}</span> akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
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