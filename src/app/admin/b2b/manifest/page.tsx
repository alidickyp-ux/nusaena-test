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
  Download,
} from "lucide-react";
import { showToast } from "@/lib/toast";

interface B2BManifest {
  id: string;
  delivery_number: string;
  vendor_name: string;
  total_box: number;
  total_weight: string;
  delivered_status: string;
  loading_date: string;
  arrive_date: string | null;
  resi_number: string | null;
  reference_price: string | null;
  cost: string;
  ppn: string;
  created_at: string;
  updated_at: string;
}

export default function B2BManifestListPage() {
  const [manifests, setManifests] = useState<B2BManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "on_the_way" | "arrived">("all");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchManifests();
  }, []);

  const fetchManifests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/b2b/manifest", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setManifests(data.data || []);
      } else {
        showToast.error("Gagal memuat data manifest B2B");
      }
    } catch (error) {
      showToast.error("Error fetching B2B manifests");
    } finally {
      setLoading(false);
    }
  };

  const filtered = manifests.filter((m) => {
    const matchSearch =
      m.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.resi_number || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || m.delivered_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatWeight = (w: string) => `${Number(w).toLocaleString("id-ID")} kg`;
  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  // 🔥 Export B2B Putaway (semua data tanpa filter)
  const handleExportPutaway = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/b2b/export/putaway", {
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal export data putaway");
      }

      const data = await res.json();
      const rows = data.data || [];

      if (rows.length === 0) {
        showToast.warning("Tidak ada data putaway untuk di-export");
        return;
      }

      const headers = [
        "Reference",
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
        "Delivery Number",
        "Vendor",
        "Resi Number",
        "Cost",
        "PPN",
      ];

      const csvRows = rows.map((row: any) => [
        row.reference || "",
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
        row.delivery_number || "",
        row.vendor_name || "",
        row.resi_number || "",
        row.cost || 0,
        row.ppn || 0,
      ]);

      const csvContent = [
        headers.join(","),
        ...csvRows.map((row: (string | number)[]) =>
          row
            .map((cell: string | number) => {
              const str = String(cell);
              if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `b2b_putaway_full_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast.success(`✅ Export ${rows.length} data putaway berhasil`);
    } catch (error) {
      console.error("Export putaway error:", error);
      showToast.error(error instanceof Error ? error.message : "Error export data");
    } finally {
      setExporting(false);
    }
  };

  // 🔥 Export Manifest Order (semua data)
  const handleExportManifest = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/b2b/export/manifest", {
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal export data manifest");
      }

      const data = await res.json();
      const rows = data.data || [];

      if (rows.length === 0) {
        showToast.warning("Tidak ada data manifest untuk di-export");
        return;
      }

      const headers = [
        "Delivery Number",
        "Vendor",
        "Total Box",
        "Total Weight (kg)",
        "Status",
        "Loading Date",
        "Arrive Date",
        "Reference Price",
        "Cost",
        "PPN",
        "Created At",
        "Updated At",
      ];

      const csvRows = rows.map((row: any) => [
        row.delivery_number || "",
        row.vendor_name || "",
        row.total_box || 0,
        row.total_weight || 0,
        row.delivered_status || "",
        row.loading_date ? new Date(row.loading_date).toLocaleString("id-ID") : "",
        row.arrive_date ? new Date(row.arrive_date).toLocaleString("id-ID") : "",
        row.reference_price || "",
        row.cost || 0,
        row.ppn || 0,
        row.created_at ? new Date(row.created_at).toLocaleString("id-ID") : "",
        row.updated_at ? new Date(row.updated_at).toLocaleString("id-ID") : "",
      ]);

      const csvContent = [
        headers.join(","),
        ...csvRows.map((row: (string | number)[]) =>
          row
            .map((cell: string | number) => {
              const str = String(cell);
              if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.setAttribute("href", URL.createObjectURL(blob));
      link.setAttribute(
        "download",
        `b2b_manifest_full_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast.success(`✅ Export ${rows.length} data manifest berhasil`);
    } catch (error) {
      console.error("Export manifest error:", error);
      showToast.error(error instanceof Error ? error.message : "Error export data");
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
          <p className="text-sm text-slate-500 mt-1">
            Daftar surat jalan B2B berdasarkan DN Number
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 🔥 Dropdown Export */}
          <div className="relative group">
            <button
              disabled={exporting || manifests.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {exporting ? "Exporting..." : "Export"}
              <Download className="w-3 h-3 ml-1" />
            </button>
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <div className="py-1">
                <button
                  onClick={handleExportPutaway}
                  disabled={exporting}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  Export B2B Putaway
                </button>
                <button
                  onClick={handleExportManifest}
                  disabled={exporting}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50 border-t border-slate-100"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                  Export Manifest Order
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={fetchManifests}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari DN Number, vendor, atau nomor resi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "on_the_way", "arrived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                statusFilter === s
                  ? "bg-[#0B2B4A] text-white"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {s === "all" ? "Semua" : s === "on_the_way" ? "On The Way" : "Arrived"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Loading
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Arrive
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
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#0B2B4A] border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                    {searchTerm ? "Tidak ada manifest yang sesuai" : "Belum ada manifest B2B"}
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-slate-800">
                        {m.delivery_number}
                      </span>
                      {m.resi_number && (
                        <p className="text-xs text-slate-400 font-mono">Resi: {m.resi_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.vendor_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {m.total_box} box · {formatWeight(m.total_weight)}
                    </td>
                    <td className="px-4 py-3">
                      {m.delivered_status === "arrived" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                          <PackageCheck className="w-3 h-3" /> Arrived
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                          <Truck className="w-3 h-3" /> On The Way
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(m.loading_date)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(m.arrive_date)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => window.open(`/print/b2b-manifest/${m.id}`, "_blank")}
                          className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Print Surat Jalan"
                        >
                          <Printer className="w-4 h-4" />
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}