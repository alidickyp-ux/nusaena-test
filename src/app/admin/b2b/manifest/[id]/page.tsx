"use client";

import { useEffect, useMemo, useState } from "react";
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
  MapPin,
  Boxes,
  Weight,
  MapPinned,
  Building2,
  User,
  IdCard,
  PackageOpen,
} from "lucide-react";
import showToast from "@/lib/toast";

// =====================================================================
// TYPES
// =====================================================================
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
          <p className="truncate text-lg font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "arrived") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        Arrived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
      <Truck className="h-3 w-3" />
      On Shipping
    </span>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span
        className={`text-right text-sm text-slate-800 ${
          mono ? "font-mono font-semibold" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 rounded bg-slate-100" />
        </td>
      ))}
    </tr>
  );
}

// =====================================================================
// MODAL: Edit Reference
// =====================================================================
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

      const boxData = details.find(
        (d) => d.reference === reference.reference
      );

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Edit className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Update Reference
              </h3>
              <p className="text-xs text-slate-500">
                Lengkapi resi, tanggal tiba, dan ship-to
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Identitas */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  DN Number
                </label>
                <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                  {reference.delivery_number || "-"}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Reference
                </label>
                <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                  {reference.reference}
                </p>
              </div>
            </div>
          </div>

          {/* Section: Info Pengiriman */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Truck className="h-3.5 w-3.5" />
              Info Pengiriman
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Nomor Resi
                </label>
                <input
                  type="text"
                  value={resiNumber}
                  onChange={(e) => setResiNumber(e.target.value)}
                  placeholder="Masukkan nomor resi"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Tanggal Tiba
                </label>
                <input
                  type="date"
                  value={arriveDate}
                  onChange={(e) => setArriveDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Kosongkan jika belum tiba
                </p>
              </div>
            </div>
          </div>

          {/* Section: Ship To */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              Ship To
            </h4>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Site
                  </label>
                  <select
                    value={selectedSite}
                    onChange={(e) => handleSiteChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                  >
                    <option value="">-- Pilih Site --</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.site}>
                        {s.site} — {s.store_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Nama toko"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Kota"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Province
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Provinsi"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 rounded-xl bg-[#0B2B4A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#123a5e] disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// PAGE
// =====================================================================
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
      const res = await fetch(`/api/b2b/manifest/${params.id}`, {
        cache: "no-store",
      });
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
      const res = await fetch(
        `/api/b2b/manifest/references/${editingRef.id}`,
        {
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
        }
      );
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

  const formatWeight = (w: string) =>
    `${Number(w).toLocaleString("id-ID")} kg`;

  // Grouped details
  const groupedDetails = useMemo(() => {
    return Object.entries(
      details.reduce<Record<string, DetailRow[]>>((acc, row) => {
        if (!acc[row.reference]) acc[row.reference] = [];
        acc[row.reference].push(row);
        return acc;
      }, {})
    );
  }, [details]);

  // Stats reference
  const refStats = useMemo(() => {
    const arrived = references.filter(
      (r) => r.delivered_status === "arrived"
    ).length;
    return {
      arrived,
      onShipping: references.length - arrived,
    };
  }, [references]);

  // =====================================================================
  // LOADING
  // =====================================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
        <div className="mx-auto max-w-[1400px] space-y-5">
          {/* Header Skeleton */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-64 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-slate-200"
              />
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
            <PackageOpen className="h-7 w-7 text-rose-500" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-800">
            Manifest tidak ditemukan
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Manifest mungkin sudah dihapus atau tidak tersedia
          </p>
          <button
            onClick={() => router.push("/admin/b2b/manifest")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0B2B4A] px-4 py-2 text-xs font-medium text-white hover:bg-[#123a5e]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Daftar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">
        {/* ============================================================= */}
        {/* HEADER                                                         */}
        {/* ============================================================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.push("/admin/b2b/manifest")}
              className="mt-0.5 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              title="Kembali"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-800">
                  {manifest.delivery_number}
                </h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-blue-200">
                  DN
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <Building2 className="h-3.5 w-3.5" />
                {manifest.vendor_name}
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              window.open(`/print/b2b-manifest/${manifest.id}`, "_blank")
            }
            className="inline-flex items-center gap-2 self-start rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 sm:self-auto"
          >
            <Printer className="h-4 w-4" />
            Print Surat Jalan
          </button>
        </div>

        {/* ============================================================= */}
        {/* STATS                                                          */}
        {/* ============================================================= */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Boxes}
            label="Total Box"
            value={manifest.total_box}
            color="blue"
          />
          <StatCard
            icon={Weight}
            label="Total Berat"
            value={formatWeight(manifest.total_weight)}
            color="indigo"
          />
          <StatCard
            icon={PackageCheck}
            label="Arrived"
            value={refStats.arrived}
            color="emerald"
          />
          <StatCard
            icon={Truck}
            label="On Shipping"
            value={refStats.onShipping}
            color="amber"
          />
        </div>

        {/* ============================================================= */}
        {/* MAIN CARD WITH TABS                                            */}
        {/* ============================================================= */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* TABS */}
          <div className="border-b border-slate-100 px-4 pt-4">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setActiveTab("dn")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === "dn"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Package className="h-4 w-4" />
                DN Header
              </button>
              <button
                onClick={() => setActiveTab("references")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === "references"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <List className="h-4 w-4" />
                References
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeTab === "references"
                      ? "bg-[#0B2B4A] text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {references.length}
                </span>
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="p-5">
            {/* TAB: DN HEADER */}
            {activeTab === "dn" && (
              <div className="space-y-1">
                <InfoRow
                  label="DN Number"
                  value={manifest.delivery_number}
                  mono
                />
                <InfoRow label="Vendor" value={manifest.vendor_name} />
                <InfoRow
                  label="Total Box"
                  value={`${manifest.total_box} box`}
                />
                <InfoRow
                  label="Total Weight"
                  value={formatWeight(manifest.total_weight)}
                />
                <InfoRow
                  label="Loading Date"
                  value={formatDate(manifest.loading_date)}
                />
                <InfoRow
                  label="Created At"
                  value={formatDate(manifest.created_at)}
                />
              </div>
            )}

            {/* TAB: REFERENCES */}
            {activeTab === "references" && (
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Reference
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Resi Number
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Tanggal Tiba
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {references.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState
                            icon={PackageOpen}
                            title="Belum ada reference"
                            description="Reference akan muncul setelah vendor mengirim data."
                          />
                        </td>
                      </tr>
                    ) : (
                      references.map((ref) => (
                        <tr
                          key={ref.id}
                          className="group transition-colors hover:bg-slate-50/60"
                        >
                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-800">
                              {ref.reference}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`font-mono text-xs ${
                                ref.resi_number
                                  ? "text-slate-800"
                                  : "text-slate-400"
                              }`}
                            >
                              {ref.resi_number || "-"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={ref.delivered_status} />
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            {formatDateOnly(ref.arrive_date)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() =>
                                  window.open(
                                    `/print/b2b-label/${manifest.id}/${ref.reference}`,
                                    "_blank"
                                  )
                                }
                                className="rounded-lg p-2 text-purple-500 transition-colors hover:bg-purple-50"
                                title="Print Label"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEditClick(ref)}
                                className="rounded-lg p-2 text-blue-500 transition-colors hover:bg-blue-50"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
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

        {/* ============================================================= */}
        {/* DETAILS SECTION                                                */}
        {/* ============================================================= */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                <Boxes className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Detail Box per Reference
                </h2>
                <p className="text-[11px] text-slate-500">
                  {groupedDetails.length} reference · {details.length} box total
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          {details.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="Belum ada box"
              description="Box akan muncul setelah proses putaway dilakukan."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {groupedDetails.map(([reference, rows]) => (
                <div key={reference} className="p-5">
                  {/* Reference Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-800">
                        {reference}
                      </span>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200">
                      {rows.length} box
                    </span>
                  </div>

                  {/* Box Grid */}
                  <div className="space-y-2">
                    {rows.map((row, idx) => (
                      <div
                        key={row.box_id || idx}
                        className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:grid-cols-4 lg:grid-cols-6"
                      >
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <Hash className="h-2.5 w-2.5" />
                            Box ID
                          </div>
                          <p className="truncate font-mono text-[11px] font-medium text-slate-700">
                            {row.box_id || "-"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <Weight className="h-2.5 w-2.5" />
                            Berat
                          </div>
                          <p className="text-[11px] font-medium text-slate-700">
                            {row.weight ? `${row.weight} kg` : "-"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <Building2 className="h-2.5 w-2.5" />
                            Toko
                          </div>
                          <p className="break-words text-[11px] font-medium text-slate-700">
                            {row.store_name || "-"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <MapPinned className="h-2.5 w-2.5" />
                            Site
                          </div>
                          <p className="truncate text-[11px] font-medium text-slate-700">
                            {row.site || "-"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <User className="h-2.5 w-2.5" />
                            Driver
                          </div>
                          <p className="truncate text-[11px] font-medium text-slate-700">
                            {row.driver || "-"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <IdCard className="h-2.5 w-2.5" />
                            No. Polisi
                          </div>
                          <p className="truncate font-mono text-[11px] font-medium text-slate-700">
                            {row.police_number || "-"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* MODAL                                                          */}
      {/* ============================================================= */}
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