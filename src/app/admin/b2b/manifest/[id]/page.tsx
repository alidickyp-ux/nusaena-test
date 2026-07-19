"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Truck,
  PackageCheck,
  Edit,
  X,
  Package,
  List,
  Hash,
  Calendar,
} from "lucide-react";
import { showToast } from "@/lib/toast";

interface ManifestData {
  id: string;
  delivery_number: string;
  vendor_name: string;
  total_box: number;
  total_weight: string;
  loading_date: string;
  created_at: string;
  updated_at: string;
}

interface ReferenceData {
  id: string;
  manifest_id: string;
  reference: string;
  resi_number: string | null;
  delivered_status: string;
  arrive_date: string | null;
  created_at: string;
  updated_at: string;
  delivery_number?: string;
  vendor_name?: string;
}

interface DetailRow {
  reference: string;
  box_id: string;
  box_number: string;
  weight: string;
  site: string;
  staging_location: string;
  store_name: string;
  address: string;
  city: string;
  province: string;
  loading_status: string;
  driver: string | null;
  operator: string | null;
  security: string | null;
  police_number: string | null;
  putaway_at: string;
  loading_at: string | null;
}

interface SiteData {
  id: number;
  site: string;
  store_name: string;
  address: string;
  city: string;
  province: string;
}

// 🔥 Popup Edit Reference
function EditReferenceModal({
  reference,
  isOpen,
  onClose,
  onSave,
  sites,
  details,
}: {
  reference: ReferenceData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    resi_number: string | null;
    arrive_date: string | null;
    site: string | null;
    store_name: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
  }) => void;
  sites: SiteData[];
  details: DetailRow[];
}) {
  const [resiNumber, setResiNumber] = useState("");
  const [arriveDate, setArriveDate] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reference) {
      setResiNumber(reference.resi_number || "");
      setArriveDate(
        reference.arrive_date
          ? new Date(reference.arrive_date).toISOString().split("T")[0]
          : ""
      );

      const boxData = details.find((d) => d.reference === reference.reference);
      
      if (boxData) {
        setSelectedSite(boxData.site || "");
        setStoreName(boxData.store_name || "");
        setAddress(boxData.address || "");
        setCity(boxData.city || "");
        setProvince(boxData.province || "");
      } else {
        setSelectedSite("");
        setStoreName("");
        setAddress("");
        setCity("");
        setProvince("");
      }
    }
  }, [reference, details]);

  const handleSiteChange = (site: string) => {
    setSelectedSite(site);
    const selected = sites.find((s) => s.site === site);
    if (selected) {
      setStoreName(selected.store_name || "");
      setAddress(selected.address || "");
      setCity(selected.city || "");
      setProvince(selected.province || "");
    } else {
      setStoreName("");
      setAddress("");
      setCity("");
      setProvince("");
    }
  };

  if (!isOpen || !reference) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave({
        resi_number: resiNumber.trim() || null,
        arrive_date: arriveDate || null,
        site: selectedSite || null,
        store_name: storeName || null,
        address: address || null,
        city: city || null,
        province: province || null,
      });
      onClose();
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Update Reference</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                DN Number
              </label>
              <p className="font-mono text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                {reference.delivery_number || "-"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Reference
              </label>
              <p className="font-mono font-bold text-sm text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">
                {reference.reference}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <Hash className="w-3 h-3 inline mr-1" />
                Nomor Resi
              </label>
              <input
                type="text"
                value={resiNumber}
                onChange={(e) => setResiNumber(e.target.value)}
                placeholder="Masukkan nomor resi (opsional)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Tanggal Tiba
              </label>
              <input
                type="date"
                value={arriveDate}
                onChange={(e) => setArriveDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Kosongkan jika belum tiba · Status akan otomatis berubah menjadi "Arrived" jika diisi
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              Ship To
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-medium mb-1">
                  Site *
                </label>
                <select
                  value={selectedSite}
                  onChange={(e) => handleSiteChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
                >
                  <option value="">-- Pilih Site --</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.site}>
                      {s.site} - {s.store_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-medium mb-1">
                  Store Name
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Nama toko"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-2">
              <label className="block text-[10px] text-slate-400 font-medium mb-1">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Alamat lengkap"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-[10px] text-slate-400 font-medium mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Kota"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-medium mb-1">
                  Province
                </label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Provinsi"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white py-3 border-t border-slate-100">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#0B2B4A] hover:bg-[#123a5e] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function B2BManifestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [references, setReferences] = useState<ReferenceData[]>([]);
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [sites, setSites] = useState<SiteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRef, setEditingRef] = useState<ReferenceData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dn" | "references">("dn");

  useEffect(() => {
    fetchDetail();
    fetchSites();
  }, [params.id]);

  const fetchSites = async () => {
    try {
      const res = await fetch("/api/b2b/master/store");
      if (res.ok) {
        const data = await res.json();
        setSites(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching sites:", error);
    }
  };

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/b2b/manifest/${params.id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setManifest(data.data.manifest);
        setReferences(data.data.references || []);
        setDetails(data.data.details || []);
      } else {
        showToast.error("Manifest tidak ditemukan");
      }
    } catch (error) {
      console.error("Error fetching manifest:", error);
      showToast.error("Error memuat detail manifest");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReference = async (data: {
    resi_number: string | null;
    arrive_date: string | null;
    site: string | null;
    store_name: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
  }) => {
    if (!editingRef) return;

    try {
      const res = await fetch(`/api/b2b/manifest/references/${editingRef.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resi_number: data.resi_number,
          arrive_date: data.arrive_date,
          site: data.site,
          store_name: data.store_name,
          address: data.address,
          city: data.city,
          province: data.province,
        }),
      });

      if (res.ok) {
        showToast.success("✅ Reference berhasil diupdate");
        fetchDetail();
      } else {
        const error = await res.json();
        showToast.error(error.message || "Gagal update reference");
      }
    } catch (error) {
      console.error("Error saving:", error);
      showToast.error("Error updating reference");
    }
  };

  const handleEditClick = (ref: ReferenceData) => {
    setEditingRef(ref);
    setIsModalOpen(true);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatWeight = (w: string) => `${Number(w).toLocaleString("id-ID")} kg`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0B2B4A] rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm mt-4">Loading manifest...</p>
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-500">Manifest tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/b2b/manifest")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 font-mono">
              {manifest.delivery_number}
            </h1>
            <p className="text-sm text-slate-500">{manifest.vendor_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/print/b2b-manifest/${manifest.id}`, "_blank")}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Surat Jalan
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-slate-800">{manifest.total_box}</p>
          <p className="text-xs text-slate-500">Total Box</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-slate-800">
            {formatWeight(manifest.total_weight)}
          </p>
          <p className="text-xs text-slate-500">Total Berat</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-sm font-bold text-slate-800">
            {formatDate(manifest.loading_date)}
          </p>
          <p className="text-xs text-slate-500">Tgl Loading</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-sm font-bold text-slate-800">
            {references.length} reference
          </p>
          <p className="text-xs text-slate-500">Total Reference</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("dn")}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === "dn"
                  ? "text-[#0B2B4A] border-b-2 border-[#0B2B4A]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              DN Header
            </button>
            <button
              onClick={() => setActiveTab("references")}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === "references"
                  ? "text-[#0B2B4A] border-b-2 border-[#0B2B4A]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <List className="w-4 h-4 inline mr-2" />
              References ({references.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === "dn" ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 text-sm font-semibold text-slate-600 w-48">DN Number</td>
                    <td className="py-3 text-sm font-mono text-slate-800">{manifest.delivery_number}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-semibold text-slate-600">Vendor</td>
                    <td className="py-3 text-sm text-slate-800">{manifest.vendor_name}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-semibold text-slate-600">Total Box</td>
                    <td className="py-3 text-sm text-slate-800">{manifest.total_box}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-semibold text-slate-600">Total Weight</td>
                    <td className="py-3 text-sm text-slate-800">{formatWeight(manifest.total_weight)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-semibold text-slate-600">Loading Date</td>
                    <td className="py-3 text-sm text-slate-800">{formatDate(manifest.loading_date)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-semibold text-slate-600">Created At</td>
                    <td className="py-3 text-sm text-slate-800">{formatDate(manifest.created_at)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Resi Number
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tanggal Tiba
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {references.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">
                        Belum ada reference untuk manifest ini
                      </td>
                    </tr>
                  ) : (
                    references.map((ref) => (
                      <tr key={ref.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-sm text-slate-800">
                            {ref.reference}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-sm ${ref.resi_number ? 'text-slate-800' : 'text-slate-400'}`}>
                            {ref.resi_number || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {ref.delivered_status === "arrived" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                              <PackageCheck className="w-3 h-3" /> Arrived
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                              <Truck className="w-3 h-3" /> On Shipping
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDateOnly(ref.arrive_date)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => window.open(`/print/b2b-label/${manifest.id}/${ref.reference}`, "_blank")}
                              className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Print Label"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditClick(ref)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details Section - FIX */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Detail Box per Reference
          </h2>
          <span className="text-xs text-slate-400">{details.length} box total</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {details.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              Belum ada box untuk manifest ini
            </div>
          ) : (
            // 🔥 Group by reference
            Object.entries(
              details.reduce<Record<string, DetailRow[]>>((acc, row) => {
                if (!acc[row.reference]) {
                  acc[row.reference] = [];
                }
                acc[row.reference].push(row);
                return acc;
              }, {})
            ).map(([reference, rows]) => (
              <div key={reference} className="p-4">
                {/* Reference Header */}
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono font-bold text-sm text-slate-800">
                    {reference}
                  </p>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {rows.length} box
                  </span>
                </div>

                {/* Box List */}
                <div className="space-y-2">
                  {rows.map((row, idx) => (
                    <div
                      key={row.box_id || idx}
                      className="grid grid-cols-5 gap-2 text-xs bg-slate-50 rounded-lg p-2"
                    >
                      <div>
                        <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">
                          Box ID
                        </span>
                        <span className="font-mono text-slate-700 text-[11px]">
                          {row.box_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">
                          Berat
                        </span>
                        <span className="text-slate-700 text-[11px]">
                          {row.weight} kg
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">
                          Toko
                        </span>
                        <span className="text-slate-700 text-[11px] truncate">
                          {row.store_name || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">
                          Driver
                        </span>
                        <span className="text-slate-700 text-[11px]">
                          {row.driver || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">
                          No. Polisi
                        </span>
                        <span className="text-slate-700 text-[11px]">
                          {row.police_number || "-"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <EditReferenceModal
        reference={editingRef}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRef(null);
        }}
        onSave={handleSaveReference}
        sites={sites}
        details={details}
      />
    </div>
  );
}