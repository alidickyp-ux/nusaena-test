"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Trash,
  ChevronDown,
  Download,
  Upload,
  RefreshCw,
  Filter,
  Building2,
  Boxes,
  PackageX,
  PackageOpen,
} from "lucide-react";
import showToast from "@/lib/toast";
import BulkUploadModal from "@/components/b2b/BulkUploadModal";

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
  id: string | null;
  manifest_id: string | null;
  reference: string;
  resi_number: string | null;
  invoice_number: string | null;
  delivered_status: string;
  arrive_date: string | null;
  created_at: string;
  updated_at: string;
  delivery_number?: string;
  vendor_name?: string;
  loading_date?: string;
  site?: string;
  store_name?: string;
  brand?: string;
  address?: string;
  city?: string;
  province?: string;
  has_dn?: boolean;
  total_box?: number;
  loading_status?: string;
}

interface RefByManifest {
  id: string;
  reference: string;
  delivery_number: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
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

const EMPTY_PAGINATION: PaginationInfo = {
  page: 1,
  limit: 25,
  totalCount: 0,
  totalPages: 1,
};

// =====================================================================
// HELPERS
// =====================================================================
async function fetchShipToFromPutaway(
  referenceCode: string
): Promise<ShipToData | null> {
  if (!referenceCode) return null;
  try {
    const res = await fetch(
      `/api/b2b/putaway/reference/${encodeURIComponent(referenceCode)}`
    );
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

// =====================================================================
// REUSABLE UI
// =====================================================================
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

// =====================================================================
// MODAL: Edit Reference (dengan DN)
// =====================================================================
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
    invoice_number: string | null;
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
  const [invoiceNumber, setInvoiceNumber] = useState("");
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
    setInvoiceNumber(reference.invoice_number || "");
    setArriveDate(
      reference.arrive_date
        ? new Date(reference.arrive_date).toISOString().split("T")[0]
        : ""
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
        invoice_number: invoiceNumber.trim() || null,
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
                Lengkapi data resi, invoice, dan ship-to
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  No Resi
                </label>
                <input
                  type="text"
                  value={resiNumber}
                  onChange={(e) => setResiNumber(e.target.value)}
                  placeholder="Nomor resi"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  No Invoice
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Nomor invoice"
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
              </div>
            </div>
          </div>

          {/* Section: Ship To */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                Ship To
              </h4>
              {loadingShipTo && (
                <span className="text-[10px] text-slate-400">Memuat...</span>
              )}
            </div>

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
// MODAL: Edit Ship To (tanpa DN)
// =====================================================================
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <MapPin className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Edit Ship To
              </h3>
              <p className="text-xs text-slate-500">
                Reference ini belum punya DN
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

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                  Reference
                </label>
                <p className="mt-1 font-mono text-sm font-bold text-amber-900">
                  {reference.reference}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                  Status
                </label>
                <p className="mt-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                    ⏳ Belum DN
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                Ship To
              </h4>
              {loadingShipTo && (
                <span className="text-[10px] text-slate-400">Memuat...</span>
              )}
            </div>

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
            {saving ? "Menyimpan..." : "Simpan Ship To"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// PAGE
// =====================================================================
export default function B2BManifestListPage() {
  const [manifests, setManifests] = useState<ManifestData[]>([]);
  const [referencesByManifest, setReferencesByManifest] = useState<
    RefByManifest[]
  >([]);

  const [withDnRefs, setWithDnRefs] = useState<ReferenceData[]>([]);
  const [withDnPage, setWithDnPage] = useState(1);
  const [withDnPagination, setWithDnPagination] =
    useState<PaginationInfo>(EMPTY_PAGINATION);
  const [loadingWithDn, setLoadingWithDn] = useState(true);

  const [noDnRefs, setNoDnRefs] = useState<ReferenceData[]>([]);
  const [noDnPage, setNoDnPage] = useState(1);
  const [noDnPagination, setNoDnPagination] =
    useState<PaginationInfo>(EMPTY_PAGINATION);
  const [loadingNoDn, setLoadingNoDn] = useState(true);

  const [sites, setSites] = useState<SiteData[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [activeTab, setActiveTab] = useState<"dn" | "references" | "nodn">(
    "dn"
  );

  const [editingRef, setEditingRef] = useState<ReferenceData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingShipToRef, setEditingShipToRef] =
    useState<ReferenceData | null>(null);
  const [isShipToModalOpen, setIsShipToModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const actionDropdownRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    reference: "",
    box_id: "",
    box_number: "",
    weight: "",
    volume: "",
    brand: "",
    site: "",
    store_name: "",
    address: "",
    city: "",
    province: "",
  });

  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterResi, setFilterResi] = useState("");
  const [filterInvoice, setFilterInvoice] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);


const [withDnSummary, setWithDnSummary] = useState({
  arrived: 0,
  on_shipping: 0,
  total_reference: 0,
});

const [noDnSummary, setNoDnSummary] = useState({
  total_reference: 0,
  total_box: 0,
});

  // =====================================================================
  // EFFECTS
  // =====================================================================
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setWithDnPage(1);
    setNoDnPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchManifests();
    fetchReferencesByManifest();
    fetchSites();
  }, []);

  useEffect(() => {
    fetchWithDn();
  }, [withDnPage, debouncedSearch]);

  useEffect(() => {
    fetchNoDn();
  }, [noDnPage, debouncedSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        actionDropdownRef.current &&
        !actionDropdownRef.current.contains(e.target as Node)
      ) {
        setIsActionDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =====================================================================
  // FETCHERS
  // =====================================================================
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

  const fetchManifests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/b2b/manifest", { cache: "no-store" });
      if (!res.ok) {
        showToast.error("Gagal memuat data manifest");
        return;
      }
      const data = await res.json();
      setManifests(data.data || []);
    } catch (error) {
      console.error("Error fetching manifest:", error);
      showToast.error("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const fetchReferencesByManifest = async () => {
    try {
      const res = await fetch("/api/b2b/manifest/references/by-manifest", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setReferencesByManifest(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching references by manifest:", error);
    }
  };

      const fetchWithDn = async () => {
      setLoadingWithDn(true);
      try {
        const params = new URLSearchParams({
          page: String(withDnPage),
          limit: "25",
          search: debouncedSearch,
        });
        if (filterStartDate) params.append("startDate", filterStartDate);
        if (filterEndDate) params.append("endDate", filterEndDate);
        if (filterResi) params.append("resi", filterResi);
        if (filterInvoice) params.append("invoice", filterInvoice);

        const res = await fetch(
          `/api/b2b/manifest/references/with-dn?${params}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setWithDnRefs(data.data || []);
          if (data.pagination) setWithDnPagination(data.pagination);

          // 🔥 Simpan summary dari API
          if (data.summary) {
            setWithDnSummary({
              arrived: data.summary.arrived || 0,
              on_shipping: data.summary.on_shipping || 0,
              total_reference: data.summary.total_reference || 0,
            });
          }
        } else {
          setWithDnRefs([]);
        }
      } catch (error) {
        console.error("Error fetching references:", error);
        showToast.error("Error fetching references");
      } finally {
        setLoadingWithDn(false);
      }
    };

  const fetchNoDn = async () => {
    setLoadingNoDn(true);
    try {
      const params = new URLSearchParams({
        page: String(noDnPage),
        limit: "25",
        search: debouncedSearch,
      });
      const res = await fetch(
        `/api/b2b/manifest/references/without-dn?${params}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setNoDnRefs(data.data || []);
        if (data.pagination) setNoDnPagination(data.pagination);
      } else {
        setNoDnRefs([]);
      }
    } catch (error) {
      console.error("Error fetching references tanpa DN:", error);
      showToast.error("Error fetching references tanpa DN");
    } finally {
      setLoadingNoDn(false);
    }
  };

  const fetchData = async () => {
    await Promise.all([
      fetchManifests(),
      fetchReferencesByManifest(),
      fetchWithDn(),
      fetchNoDn(),
    ]);
  };

  // =====================================================================
  // HANDLERS
  // =====================================================================
  const handleSaveReference = async (data: {
    resi_number: string | null;
    invoice_number: string | null;
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
          body: JSON.stringify(data),
        }
      );
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
        `/api/b2b/putaway/reference/${encodeURIComponent(
          editingShipToRef.reference
        )}`,
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

  const handleCreateBox = async () => {
    try {
      const res = await fetch("/api/b2b/putaway/manual-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        showToast.success("✅ Box berhasil dibuat");
        setIsCreateModalOpen(false);
        setCreateForm({
          reference: "",
          box_id: "",
          box_number: "",
          weight: "",
          volume: "",
          brand: "",
          site: "",
          store_name: "",
          address: "",
          city: "",
          province: "",
        });
        fetchData();
      } else {
        const error = await res.json();
        showToast.error(error.message || "Gagal membuat box");
      }
    } catch (error) {
      console.error("Error creating box:", error);
      showToast.error("Error creating box");
    }
  };

  const handleDeleteReference = async (ref: ReferenceData) => {
    if (
      !confirm(
        "Yakin ingin menghapus reference ini? Semua box akan di hapus."
      )
    )
      return;

    const key = ref.id || ref.reference;
    setDeletingId(key);
    try {
      const query = ref.id
        ? `id=${ref.id}`
        : `reference=${encodeURIComponent(ref.reference)}`;

      const res = await fetch(`/api/b2b/putaway/manual-create?${query}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast.success("✅ Reference berhasil dihapus");
        await fetchData();
      } else {
        const error = await res.json();
        showToast.error(error.message || "Gagal menghapus reference");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      showToast.error("Terjadi kesalahan saat menghapus");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditClick = (ref: ReferenceData) => {
    setEditingRef(ref);
    setIsModalOpen(true);
  };

  const handlePrintLabel = (reference: string) => {
    window.open(
      `/print/b2b-label/reference/${encodeURIComponent(reference)}`,
      "_blank"
    );
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (d: string | null | undefined) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatWeight = (w: string) =>
    `${Number(w).toLocaleString("id-ID")} kg`;

  const handleExportPutaway = async () => {
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
        "Invoice Number",
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
        "Brand",
      ];

      const exportRows = rows.map((row: any) => [
        row.delivery_number || "",
        row.vendor_name || "",
        row.reference || "",
        row.resi_number || "",
        row.invoice_number || "",
        row.delivered_status || "",
        row.loading_date
          ? new Date(row.loading_date).toLocaleString("id-ID")
          : "",
        row.arrive_date
          ? new Date(row.arrive_date).toLocaleString("id-ID")
          : "",
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
        row.putaway_at
          ? new Date(row.putaway_at).toLocaleString("id-ID")
          : "",
        row.brand || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...exportRows.map((row: (string | number)[]) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `b2b_putaway_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast.success(`✅ Export ${rows.length} data berhasil`);
    } catch (error) {
      console.error("Export error:", error);
      showToast.error("Error export");
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    setIsActionDropdownOpen(false);
    try {
      const res = await fetch("/api/b2b/putaway/template", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Gagal download template");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      let filename = `template-putaway-b2b-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      const disposition = res.headers.get("Content-Disposition");
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast.success("✅ Template berhasil diunduh");
    } catch (error) {
      console.error("Download template error:", error);
      showToast.error("Gagal download template");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

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

  // =====================================================================
  // COMPUTED
  // =====================================================================
  const filteredManifests = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return manifests.filter((m) => {
      const dn = (m.delivery_number || "").toLowerCase();
      const vendor = (m.vendor_name || "").toLowerCase();
      return dn.includes(search) || vendor.includes(search);
    });
  }, [manifests, searchTerm]);

        const stats = useMemo(() => {
        const totalDn = manifests.length;
        const totalRef = withDnSummary.total_reference + noDnSummary.total_reference;

        return {
          totalDn,
          totalRef,
          arrived: withDnSummary.arrived,
          onShipping: withDnSummary.on_shipping,
        };
      }, [manifests, withDnSummary, noDnSummary]);

  const hasActiveFilter =
    !!filterStartDate || !!filterEndDate || !!filterResi || !!filterInvoice;

  // =====================================================================
  // RENDER
  // =====================================================================
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
                Manifest B2B
              </h1>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-blue-200">
                Putaway
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Kelola surat jalan B2B, reference, dan status putaway
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Dropdown Aksi */}
            <div className="relative" ref={actionDropdownRef}>
              <button
                onClick={() => setIsActionDropdownOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B2B4A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#123a5e]"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Aksi Putaway
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isActionDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isActionDropdownOpen && (
                <div className="absolute right-0 z-30 mt-2 w-72 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
                  <button
                    onClick={handleDownloadTemplate}
                    disabled={isDownloadingTemplate}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                      <Download className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {isDownloadingTemplate
                          ? "Mengunduh..."
                          : "Download Template"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Format .xlsx + sheet Petunjuk
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsActionDropdownOpen(false);
                      setIsBulkModalOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                      <Upload className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        Bulk Upload
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Upload Excel, max 1000 baris
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsActionDropdownOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                      <Plus className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        Manual Create
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Input 1 box secara manual
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleExportPutaway}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </button>

            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* STATS                                                          */}
        {/* ============================================================= */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Package}
            label="Total DN"
            value={stats.totalDn}
            color="blue"
          />
          <StatCard
            icon={List}
            label="Total Reference"
            value={stats.totalRef}
            color="indigo"
          />
          <StatCard
            icon={PackageCheck}
            label="Arrived"
            value={stats.arrived}
            color="emerald"
          />
          <StatCard
            icon={Truck}
            label="On Shipping"
            value={stats.onShipping}
            color="amber"
          />
        </div>

        {/* ============================================================= */}
        {/* TOOLBAR                                                        */}
        {/* ============================================================= */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari DN Number, Reference, Resi, atau Invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
            />
          </div>

          {activeTab === "references" && (
            <button
              onClick={() => setShowFilterPanel((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
                hasActiveFilter || showFilterPanel
                  ? "border-[#0B2B4A] bg-[#0B2B4A] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-4 w-4" />
              Filter
              {hasActiveFilter && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                  ●
                </span>
              )}
            </button>
          )}
        </div>

        {/* FILTER PANEL */}
        {activeTab === "references" && showFilterPanel && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Tanggal Loading
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                  />
                  <span className="text-xs text-slate-400">—</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  No Resi
                </label>
                <input
                  type="text"
                  value={filterResi}
                  onChange={(e) => setFilterResi(e.target.value)}
                  placeholder="Cari resi..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  No Invoice
                </label>
                <input
                  type="text"
                  value={filterInvoice}
                  onChange={(e) => setFilterInvoice(e.target.value)}
                  placeholder="Cari invoice..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => {
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setFilterResi("");
                  setFilterInvoice("");
                  setWithDnPage(1);
                  setTimeout(fetchWithDn, 100);
                }}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  setWithDnPage(1);
                  fetchWithDn();
                }}
                className="rounded-lg bg-[#0B2B4A] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#123a5e]"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* MAIN CARD WITH TABS                                            */}
        {/* ============================================================= */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* TABS */}
          <div className="border-b border-slate-100 px-4 pt-4">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <TabButton
                active={activeTab === "dn"}
                onClick={() => setActiveTab("dn")}
                icon={Package}
                label="DN Header"
                count={manifests.length}
              />
              <TabButton
                active={activeTab === "references"}
                onClick={() => setActiveTab("references")}
                icon={List}
                label="Semua Reference"
                count={withDnPagination.totalCount}
              />
              <TabButton
                active={activeTab === "nodn"}
                onClick={() => setActiveTab("nodn")}
                icon={PackageCheck}
                label="Tanpa DN"
                count={noDnPagination.totalCount}
              />
            </div>
          </div>

          {/* CONTENT */}
          <div>
            {/* ========================================================= */}
            {/* TAB 1: DN HEADER                                          */}
            {/* ========================================================= */}
            {activeTab === "dn" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        DN Number
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Vendor
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Box / Berat
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Loading Date
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
                    ) : filteredManifests.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState
                            icon={PackageOpen}
                            title={
                              searchTerm
                                ? "Tidak ada manifest yang sesuai"
                                : "Belum ada manifest B2B"
                            }
                            description={
                              searchTerm
                                ? "Coba ubah kata kunci pencarian Anda."
                                : "Mulai dengan bulk upload atau buat manual."
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredManifests.map((m) => {
                        const refsUnderThisDN = referencesByManifest.filter(
                          (r) => r.delivery_number === m.delivery_number
                        );
                        return (
                          <tr
                            key={m.id}
                            className="group transition-colors hover:bg-slate-50/60"
                          >
                            <td className="px-5 py-4">
                              <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-800">
                                {m.delivery_number}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-600">
                              {m.vendor_name}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                                  {m.total_box} box
                                </span>
                                <span className="text-xs text-slate-500">
                                  {formatWeight(m.total_weight)}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-500">
                              {formatDate(m.loading_date)}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {refsUnderThisDN.length === 1 ? (
                                  <button
                                    onClick={() =>
                                      handlePrintLabel(
                                        refsUnderThisDN[0].reference
                                      )
                                    }
                                    className="rounded-lg p-2 text-purple-500 transition-colors hover:bg-purple-50"
                                    title="Print Label"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </button>
                                ) : refsUnderThisDN.length > 1 ? (
                                  <div className="relative group/menu">
                                    <button
                                      className="rounded-lg p-2 text-purple-500 transition-colors hover:bg-purple-50"
                                      title={`Print Label (${refsUnderThisDN.length} reference)`}
                                    >
                                      <Printer className="h-4 w-4" />
                                    </button>
                                    <div className="invisible absolute right-0 top-full z-10 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 opacity-0 shadow-lg transition-all group-hover/menu:visible group-hover/menu:opacity-100">
                                      {refsUnderThisDN.map((r) => (
                                        <button
                                          key={r.id}
                                          onClick={() =>
                                            handlePrintLabel(r.reference)
                                          }
                                          className="w-full px-3 py-1.5 text-left font-mono text-xs text-slate-700 hover:bg-slate-50"
                                        >
                                          {r.reference}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                                <button
                                  onClick={() =>
                                    window.open(
                                      `/print/b2b-manifest/${m.id}`,
                                      "_blank"
                                    )
                                  }
                                  className="rounded-lg p-2 text-purple-500 transition-colors hover:bg-purple-50"
                                  title="Print Surat Jalan"
                                >
                                  <PackageCheck className="h-4 w-4" />
                                </button>
                                <Link
                                  href={`/admin/b2b/manifest/${m.id}`}
                                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                  title="Lihat Detail"
                                >
                                  <ChevronRight className="h-4 w-4" />
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

            {/* ========================================================= */}
            {/* TAB 2: SEMUA REFERENCE                                    */}
            {/* ========================================================= */}
            {activeTab === "references" && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          DN / Vendor
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Reference
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Loading At
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Arrived At
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Resi
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Invoice
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingWithDn ? (
                        <>
                          <SkeletonRow cols={8} />
                          <SkeletonRow cols={8} />
                          <SkeletonRow cols={8} />
                        </>
                      ) : withDnRefs.length === 0 ? (
                        <tr>
                          <td colSpan={8}>
                            <EmptyState
                              icon={PackageX}
                              title="Tidak ada reference"
                              description={
                                searchTerm || hasActiveFilter
                                  ? "Tidak ada reference yang cocok dengan filter."
                                  : "Reference akan muncul setelah ada DN."
                              }
                            />
                          </td>
                        </tr>
                      ) : (
                        withDnRefs.map((ref) => (
                          <tr
                            key={ref.id}
                            className="group transition-colors hover:bg-slate-50/60"
                          >
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-mono text-xs text-slate-700">
                                  {ref.delivery_number || "-"}
                                </span>
                                {ref.vendor_name && (
                                  <span className="font-mono text-[10px] text-rose-600">
                                    {ref.vendor_name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-xs font-bold text-slate-800">
                                  {ref.reference}
                                </span>
                                {ref.store_name && (
                                  <span className="text-[10px] text-rose-600">
                                    {ref.store_name}
                                  </span>
                                )}
                                {ref.brand && (
                                  <span className="text-[10px] font-medium text-emerald-700">
                                    {ref.brand}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {formatDate(ref.loading_date || null)}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {formatDateOnly(ref.arrive_date)}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={ref.delivered_status} />
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-slate-600">
                                {ref.resi_number || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-slate-600">
                                {ref.invoice_number || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handlePrintLabel(ref.reference)}
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

                  {withDnPagination.totalPages > 1 && (
                    <Pagination
                      page={withDnPagination.page}
                      totalPages={withDnPagination.totalPages}
                      totalCount={withDnPagination.totalCount}
                      onPageChange={setWithDnPage}
                      getPageNumbers={getPageNumbers}
                    />
                  )}
                </div>
              </>
            )}

            {/* ========================================================= */}
            {/* TAB 3: TANPA DN                                            */}
            {/* ========================================================= */}
            {activeTab === "nodn" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Reference
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Store
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Site
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        City
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Province
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Address
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Box
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingNoDn ? (
                      <>
                        <SkeletonRow cols={8} />
                        <SkeletonRow cols={8} />
                        <SkeletonRow cols={8} />
                      </>
                    ) : noDnRefs.length === 0 ? (
                      <tr>
                        <td colSpan={8}>
                          <EmptyState
                            icon={PackageCheck}
                            title={
                              searchTerm
                                ? "Tidak ada reference yang sesuai"
                                : "Semua reference sudah memiliki DN"
                            }
                            description={
                              searchTerm
                                ? "Coba ubah kata kunci pencarian Anda."
                                : "Semua reference sudah selesai diproses."
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      noDnRefs.map((ref) => (
                        <tr
                          key={ref.reference}
                          className="group transition-colors hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-bold text-slate-800">
                              {ref.reference}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {ref.store_name || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {ref.site || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {ref.city || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {ref.province || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-[180px] truncate">
                            {ref.address || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                              {ref.total_box || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handlePrintLabel(ref.reference)}
                                className="rounded-lg p-2 text-purple-500 transition-colors hover:bg-purple-50"
                                title="Print Label"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEditShipToClick(ref)}
                                className="rounded-lg p-2 text-blue-500 transition-colors hover:bg-blue-50"
                                title="Edit Ship To"
                              >
                                <MapPin className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteReference(ref)}
                                disabled={
                                  deletingId !== null &&
                                  deletingId ===
                                    (ref.id || ref.reference)
                                }
                                className="rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-50"
                                title="Hapus"
                              >
                                {deletingId !== null &&
                                deletingId === (ref.id || ref.reference) ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                                ) : (
                                  <Trash className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {noDnPagination.totalPages > 1 && (
                  <Pagination
                    page={noDnPagination.page}
                    totalPages={noDnPagination.totalPages}
                    totalCount={noDnPagination.totalCount}
                    onPageChange={setNoDnPage}
                    getPageNumbers={getPageNumbers}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* MODALS                                                         */}
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
      />

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

      {/* Modal Create Box */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Boxes className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Buat Box Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Input manual 1 box ke staging
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Identitas */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Package className="h-3.5 w-3.5" />
                  Identitas Box
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Reference <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={createForm.reference}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          reference: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                      placeholder="SPXID001"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Box ID
                    </label>
                    <input
                      type="text"
                      value={createForm.box_id}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          box_id: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                      placeholder="Auto = Reference"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Box Number
                    </label>
                    <input
                      type="text"
                      value={createForm.box_number || ""}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          box_number: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                      placeholder="Auto = Reference"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Brand
                    </label>
                    <select
                      value={createForm.brand}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, brand: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                    >
                      <option value="">-- Pilih Brand --</option>
                      <option value="EXSPORT">EXSPORT</option>
                      <option value="BODYPACK">BODYPACK</option>
                      <option value="SHARED OPS">SHARED OPS</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ukuran */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Boxes className="h-3.5 w-3.5" />
                  Ukuran (minimal salah satu)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.weight}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, weight: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                      placeholder="15.5"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Volume (m³)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.volume}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, volume: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                      placeholder="0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Ship To */}
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
                      <input
                        type="text"
                        value={createForm.site}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, site: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                        placeholder="ST00010"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Store Name
                      </label>
                      <input
                        type="text"
                        value={createForm.store_name}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            store_name: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                        placeholder="SUMATERA"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Address
                    </label>
                    <input
                      type="text"
                      value={createForm.address}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          address: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                      placeholder="JL. SUMATERA NO. 10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        City
                      </label>
                      <input
                        type="text"
                        value={createForm.city}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, city: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                        placeholder="BANDUNG"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Province
                      </label>
                      <input
                        type="text"
                        value={createForm.province}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            province: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                        placeholder="JAWA BARAT"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleCreateBox}
                className="flex-1 rounded-xl bg-[#0B2B4A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#123a5e]"
              >
                Buat Box
              </button>
            </div>
          </div>
        </div>
      )}

      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
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
  value: number;
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
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="text-xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-white text-slate-800 shadow-sm"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      <span
        className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
          active ? "bg-[#0B2B4A] text-white" : "bg-slate-200 text-slate-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  totalCount,
  onPageChange,
  getPageNumbers,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (updater: (p: number) => number) => void;
  getPageNumbers: (current: number, total: number) => (number | "...")[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
      <span className="text-xs text-slate-500">
        Halaman <span className="font-semibold">{page}</span> dari{" "}
        <span className="font-semibold">{totalPages}</span> ·{" "}
        <span className="font-semibold">{totalCount}</span> total data
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          Prev
        </button>

        {getPageNumbers(page, totalPages).map((p, idx) =>
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
              onClick={() => onPageChange(() => p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                p === page
                  ? "bg-[#0B2B4A] text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}