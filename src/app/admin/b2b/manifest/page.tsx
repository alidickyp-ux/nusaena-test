"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Printer,
  Search,
  ChevronRight,
  Truck,
  PackageCheck,
  FileSpreadsheet,
  Package,
  List,
  Edit,
  X,
  Calendar,
  Hash,
  MapPin,
  Plus,
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
  loading_date?: string;
  site?: string;
  store_name?: string;
  address?: string;
  city?: string;
  province?: string;
  has_dn?: boolean;
  total_box?: number;
}

interface SiteData {
  id: number;
  site: string;
  store_name: string;
  address: string;
  city: string;
  province: string;
}

interface ShipToData {
  site: string | null;
  store_name: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
}

// 🔥 Dipakai bersama oleh EditReferenceModal & EditShipToModal
async function fetchShipToFromPutaway(referenceCode: string): Promise<ShipToData | null> {
  if (!referenceCode) return null;
  try {
    const res = await fetch(`/api/b2b/putaway/reference/${encodeURIComponent(referenceCode)}`);
    if (res.ok) {
      const data = await res.json();
      const box = data.data;
      if (box) {
        return {
          site: box.site || "",
          store_name: box.store_name || "",
          address: box.address || "",
          city: box.city || "",
          province: box.province || "",
        };
      }
    }
  } catch (error) {
    console.error("Error fetching ship to:", error);
  }
  return null;
}

// 🔥 Popup Edit Reference (untuk reference yang sudah punya DN)
function EditReferenceModal({
  reference,
  isOpen,
  onClose,
  onSave,
  sites,
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
}) {
  const [resiNumber, setResiNumber] = useState("");
  const [arriveDate, setArriveDate] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingShipTo, setLoadingShipTo] = useState(false);

  useEffect(() => {
    if (!reference) return;

    setResiNumber(reference.resi_number || "");
    setArriveDate(
      reference.arrive_date ? new Date(reference.arrive_date).toISOString().split("T")[0] : ""
    );

    setLoadingShipTo(true);
    fetchShipToFromPutaway(reference.reference).then((box) => {
      if (box) {
        setSelectedSite(box.site || "");
        setStoreName(box.store_name || "");
        setAddress(box.address || "");
        setCity(box.city || "");
        setProvince(box.province || "");
      }
      setLoadingShipTo(false);
    });
  }, [reference]);

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
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                DN Number
              </label>
              <p className="font-mono font-bold text-sm text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ship To</label>
              {loadingShipTo && <span className="text-xs text-slate-400">Loading...</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-medium mb-1">Site *</label>
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
                <label className="block text-[10px] text-slate-400 font-medium mb-1">Store Name</label>
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
              <label className="block text-[10px] text-slate-400 font-medium mb-1">Address</label>
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
                <label className="block text-[10px] text-slate-400 font-medium mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Kota"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-medium mb-1">Province</label>
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

// 🔥 Popup Edit Ship To (khusus untuk reference tanpa DN)
function EditShipToModal({
  reference,
  isOpen,
  onClose,
  onSave,
  sites,
}: {
  reference: ReferenceData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    site: string | null;
    store_name: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
  }) => Promise<void> | void;
  sites: SiteData[];
}) {
  const [selectedSite, setSelectedSite] = useState("");
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingShipTo, setLoadingShipTo] = useState(false);

  useEffect(() => {
    if (!reference) return;

    setLoadingShipTo(true);
    fetchShipToFromPutaway(reference.reference).then((box) => {
      if (box) {
        setSelectedSite(box.site || "");
        setStoreName(box.store_name || "");
        setAddress(box.address || "");
        setCity(box.city || "");
        setProvince(box.province || "");
      }
      setLoadingShipTo(false);
    });
  }, [reference]);

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
          <h3 className="text-lg font-bold text-slate-800">Edit Ship To</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Reference
              </label>
              <p className="font-mono font-bold text-sm text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">
                {reference.reference}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Status
              </label>
              <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full">
                  ⏳ Belum DN
                </span>
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ship To</label>
              {loadingShipTo && <span className="text-xs text-slate-400">Loading...</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-medium mb-1">Site *</label>
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
                <label className="block text-[10px] text-slate-400 font-medium mb-1">Store Name</label>
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
              <label className="block text-[10px] text-slate-400 font-medium mb-1">Address</label>
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
                <label className="block text-[10px] text-slate-400 font-medium mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Kota"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-medium mb-1">Province</label>
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
              {saving ? "Menyimpan..." : "Simpan Ship To"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function B2BManifestListPage() {
  const [manifests, setManifests] = useState<ManifestData[]>([]);
  const [allReferences, setAllReferences] = useState<ReferenceData[]>([]);
  const [referencesWithoutDN, setReferencesWithoutDN] = useState<ReferenceData[]>([]);
  const [sites, setSites] = useState<SiteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"dn" | "references" | "nodn">("dn");

  const [editingRef, setEditingRef] = useState<ReferenceData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingShipToRef, setEditingShipToRef] = useState<ReferenceData | null>(null);
  const [isShipToModalOpen, setIsShipToModalOpen] = useState(false);

  // 🔥 State untuk create modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    reference: '',
    box_id: '',
    weight: '',
    volume: '',
    site: '',
    store_name: '',
    address: '',
    city: '',
    province: '',
  });

  useEffect(() => {
    fetchData();
    fetchSites();
  }, []);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const resManifests = await fetch("/api/b2b/manifest", { cache: "no-store" });
      if (!resManifests.ok) {
        showToast.error("Gagal memuat data manifest");
        return;
      }
      const manifestData = await resManifests.json();
      setManifests(manifestData.data || []);

      const resReferences = await fetch("/api/b2b/manifest/references/all", { cache: "no-store" });
      if (resReferences.ok) {
        const refData = await resReferences.json();
        const allRefs: ReferenceData[] = refData.data || [];
        setAllReferences(allRefs);
        setReferencesWithoutDN(allRefs.filter((ref) => ref.has_dn === false));
      } else {
        setAllReferences([]);
        setReferencesWithoutDN([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast.error("Error fetching data");
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
        body: JSON.stringify(data),
      });

      if (res.ok) {
        showToast.success("✅ Reference berhasil diupdate");
        fetchData();
      } else {
        const error = await res.json();
        showToast.error(error.message || "Gagal update reference");
      }
    } catch (error) {
      console.error("Error saving:", error);
      showToast.error("Error updating reference");
    }
  };

  const handleEditShipToClick = (ref: ReferenceData) => {
    setEditingShipToRef(ref);
    setIsShipToModalOpen(true);
  };

  const handleSaveShipTo = async (data: {
    site: string | null;
    store_name: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
  }) => {
    if (!editingShipToRef) return;

    try {
      const res = await fetch(
        `/api/b2b/putaway/reference/${encodeURIComponent(editingShipToRef.reference)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (res.ok) {
        showToast.success("✅ Ship To berhasil diupdate");
        fetchData();
        setIsShipToModalOpen(false);
        setEditingShipToRef(null);
      } else {
        const error = await res.json();
        showToast.error(error.message || "Gagal update ship to");
      }
    } catch (error) {
      console.error("Error saving ship to:", error);
      showToast.error("Error updating ship to");
    }
  };

  // 🔥 handleCreateBox
  const handleCreateBox = async () => {
    try {
      const res = await fetch('/api/b2b/putaway/manual-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      if (res.ok) {
        showToast.success('✅ Box berhasil dibuat');
        setIsCreateModalOpen(false);
        setCreateForm({ 
          reference: '', 
          box_id: '', 
          weight: '', 
          volume: '', 
          site: '', 
          store_name: '', 
          address: '', 
          city: '', 
          province: '' 
        });
        fetchData();
      } else {
        const error = await res.json();
        showToast.error(error.message || 'Gagal membuat box');
      }
    } catch (error) {
      console.error('Error creating box:', error);
      showToast.error('Error creating box');
    }
  };

  const handleEditClick = (ref: ReferenceData) => {
    setEditingRef(ref);
    setIsModalOpen(true);
  };

  const handlePrintLabel = (reference: string) => {
    window.open(`/print/b2b-label/reference/${encodeURIComponent(reference)}`, "_blank");
  };

  const filteredManifests = manifests.filter((m) => {
    const matchSearch =
      m.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const filteredReferences = allReferences.filter((r) => {
    const matchSearch =
      (r.delivery_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.resi_number || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const filteredNoDN = referencesWithoutDN.filter((r) => {
    const matchSearch =
      r.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.store_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.site || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

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

  const handleExportPutaway = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/b2b/export/putaway", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal export");
      const data = await res.json();
      const rows = data.data || [];
      if (rows.length === 0) {
        showToast.warning("Tidak ada data");
        return;
      }

      const headers = [
        "DN Number",
        "Vendor",
        "Reference",
        "Resi Number",
        "Status",
        "Loading Date",
        "Arrive Date",
        "Box ID",
        "Box Number",
        "Weight (kg)",
        "Site",
        "Staging Location",
        "Store Name",
        "Address",
        "City",
        "Province",
        "Loading Status",
        "Driver",
        "Operator",
        "Security",
        "Police Number",
        "Putaway At",
        "Loading At",
      ];

      const exportRows = rows.map((row: any) => [
        row.delivery_number || "",
        row.vendor_name || "",
        row.reference || "",
        row.resi_number || "",
        row.delivered_status || "",
        row.loading_date ? new Date(row.loading_date).toLocaleString("id-ID") : "",
        row.arrive_date ? new Date(row.arrive_date).toLocaleString("id-ID") : "",
        row.box_id || "",
        row.box_number || "",
        row.weight || "",
        row.site || "",
        row.staging_location || "",
        row.store_name || "",
        row.address || "",
        row.city || "",
        row.province || "",
        row.loading_status || "",
        row.driver || "",
        row.operator || "",
        row.security || "",
        row.police_number || "",
        row.putaway_at ? new Date(row.putaway_at).toLocaleString("id-ID") : "",
        row.loading_at ? new Date(row.loading_at).toLocaleString("id-ID") : "",
      ]);

      const csvContent = [
        headers.join(","),
        ...exportRows.map((row: (string | number)[]) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `b2b_putaway_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast.success(`✅ Export ${rows.length} data berhasil`);
    } catch (error) {
      console.error("Export error:", error);
      showToast.error("Error export");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manifest B2B</h1>
          <p className="text-sm text-slate-500 mt-1">Daftar surat jalan B2B berdasarkan DN Number</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 🔥 Tombol Buat Baru */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Buat Baru
          </button>
          <button
            onClick={handleExportPutaway}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari DN Number, Reference, atau Resi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("dn")}
              className={`px-6 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === "dn"
                  ? "text-[#0B2B4A] border-b-2 border-[#0B2B4A]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Package className="w-4 h-4" />
              DN Header ({manifests.length})
            </button>
            <button
              onClick={() => setActiveTab("references")}
              className={`px-6 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === "references"
                  ? "text-[#0B2B4A] border-b-2 border-[#0B2B4A]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <List className="w-4 h-4" />
              Semua Reference ({allReferences.length})
            </button>
            <button
              onClick={() => setActiveTab("nodn")}
              className={`px-6 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === "nodn"
                  ? "text-[#0B2B4A] border-b-2 border-[#0B2B4A]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              Tanpa DN ({referencesWithoutDN.length})
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* TAB 1: DN HEADER */}
          {activeTab === "dn" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      DN Number
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Box / Berat
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Loading Date
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-[#0B2B4A] border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : filteredManifests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">
                        {searchTerm ? "Tidak ada manifest yang sesuai" : "Belum ada manifest B2B"}
                      </td>
                    </tr>
                  ) : (
                    filteredManifests.map((m) => {
                      const refsUnderThisDN = allReferences.filter(
                        (r) => r.delivery_number === m.delivery_number
                      );

                      return (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono font-semibold text-sm text-slate-800">
                              {m.delivery_number}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{m.vendor_name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {m.total_box} box · {formatWeight(m.total_weight)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{formatDate(m.loading_date)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {refsUnderThisDN.length === 1 ? (
                                <button
                                  onClick={() => handlePrintLabel(refsUnderThisDN[0].reference)}
                                  className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Print Label"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              ) : refsUnderThisDN.length > 1 ? (
                                <div className="relative group">
                                  <button
                                    className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                                    title={`Print Label (${refsUnderThisDN.length} reference)`}
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                  <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[160px] py-1">
                                    {refsUnderThisDN.map((r) => (
                                      <button
                                        key={r.id}
                                        onClick={() => handlePrintLabel(r.reference)}
                                        className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-slate-50 text-slate-700"
                                      >
                                        {r.reference}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                              <button
                                onClick={() => window.open(`/print/b2b-manifest/${m.id}`, "_blank")}
                                className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Print Surat Jalan"
                              >
                                <PackageCheck className="w-4 h-4" />
                              </button>
                              <Link
                                href={`/admin/b2b/manifest/${m.id}`}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Lihat Detail"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: SEMUA REFERENCE */}
          {activeTab === "references" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      DN Number
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Loading At
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Arrived At
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      No Resi
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredReferences.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                        Belum ada reference
                      </td>
                    </tr>
                  ) : (
                    filteredReferences.map((ref) => (
                      <tr key={ref.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-slate-700">
                            {ref.delivery_number || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-sm text-slate-800">{ref.reference}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDate(ref.loading_date || null)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDateOnly(ref.arrive_date)}
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
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm">{ref.resi_number || "-"}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handlePrintLabel(ref.reference)}
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

          {/* TAB 3: REFERENCE TANPA DN */}
          {activeTab === "nodn" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Store
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      City
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Province
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Box
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredNoDN.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">
                        {searchTerm ? "Tidak ada reference yang sesuai" : "Semua reference sudah memiliki DN"}
                      </td>
                    </tr>
                  ) : (
                    filteredNoDN.map((ref) => (
                      <tr key={ref.reference} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-sm text-slate-800">{ref.reference}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{ref.store_name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{ref.site || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{ref.city || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{ref.province || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[150px] truncate">
                          {ref.address || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{ref.total_box || 0}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handlePrintLabel(ref.reference)}
                              className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Print Label"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditShipToClick(ref)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Ship To"
                            >
                              <MapPin className="w-4 h-4" />
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

      {/* Modal Edit Reference (dengan DN) */}
      <EditReferenceModal
        reference={editingRef}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRef(null);
        }}
        onSave={handleSaveReference}
        sites={sites}
      />

      {/* Modal Edit Ship To (tanpa DN) */}
      <EditShipToModal
        reference={editingShipToRef}
        isOpen={isShipToModalOpen}
        onClose={() => {
          setIsShipToModalOpen(false);
          setEditingShipToRef(null);
        }}
        onSave={handleSaveShipTo}
        sites={sites}
      />

      {/* 🔥 Modal Create Box */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Buat Box Baru</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500">Reference *</label>
                  <input
                    type="text"
                    value={createForm.reference}
                    onChange={(e) => setCreateForm({ ...createForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="SKR23232"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500">Box ID *</label>
                  <input
                    type="text"
                    value={createForm.box_id}
                    onChange={(e) => setCreateForm({ ...createForm, box_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="PCA23-26000466BOX-01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.weight}
                    onChange={(e) => setCreateForm({ ...createForm, weight: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="15.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500">Volume (m³)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.volume}
                    onChange={(e) => setCreateForm({ ...createForm, volume: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="0.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500">Site</label>
                <input
                  type="text"
                  value={createForm.site}
                  onChange={(e) => setCreateForm({ ...createForm, site: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="ST00010"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500">Store Name</label>
                <input
                  type="text"
                  value={createForm.store_name}
                  onChange={(e) => setCreateForm({ ...createForm, store_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="SUMATERA"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500">Address</label>
                <input
                  type="text"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="JL. SUMATERA"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500">City</label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="BANDUNG"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500">Province</label>
                  <input
                    type="text"
                    value={createForm.province}
                    onChange={(e) => setCreateForm({ ...createForm, province: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="JAWA BARAT"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreateBox}
                  className="flex-1 px-4 py-2 bg-[#0B2B4A] hover:bg-[#123a5e] text-white rounded-lg text-sm font-medium"
                >
                  Buat Box
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}