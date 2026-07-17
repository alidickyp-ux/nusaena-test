"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Save, Truck, PackageCheck, FileSpreadsheet, Plus, X } from "lucide-react";
import { showToast } from "@/lib/toast";

interface ManifestData {
  id: string;
  delivery_number: string;
  vendor_name: string;
  total_box: number;
  total_weight: string;
  delivered_status: string;
  loading_date: string;
  arrive_date: string | null;
  reference_price: string | null;
  cost: string;
  ppn: string;
  references: ReferenceResi[];
}

interface DetailRow {
  reference: string;
  box_id: string;
  box_number: string;
  weight: string;
  site: string;
  staging_location: string;
  store_name: string;
  loading_status: string;
  driver: string | null;
  operator: string | null;
  security: string | null;
  police_number: string | null;
  putaway_at: string;
  loading_at: string | null;
  address?: string;
  city?: string;
  province?: string;
  driver_sign?: string | null;
  security_sign?: string | null;
}

interface ReferenceResi {
  id?: string;
  reference: string;
  resi_number: string | null;
  cost: number | null;
  ppn: number | null;
}

export default function B2BManifestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Form state
  const [deliveredStatus, setDeliveredStatus] = useState("on_the_way");
  const [arriveDate, setArriveDate] = useState("");
  const [referenceResis, setReferenceResis] = useState<ReferenceResi[]>([]);
  const [referencePrice, setReferencePrice] = useState("");

  useEffect(() => {
    fetchDetail();
  }, [params.id]);

  const toDatetimeLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/b2b/manifest/${params.id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const m: ManifestData = data.data.manifest;
        setManifest(m);
        setDetails(data.data.details || []);

        setDeliveredStatus(m.delivered_status || "on_the_way");
        setArriveDate(toDatetimeLocal(m.arrive_date));
        setReferencePrice(m.reference_price || "");

        // 🔥 Ambil references dari database
        const refs = (m.references || []).map((ref: any) => ({
          id: ref.id,
          reference: String(ref.reference || ""),
          resi_number: ref.resi_number || null,
          cost: ref.cost ?? null,
          ppn: ref.ppn ?? null,
        }));

        if (refs.length > 0) {
          setReferenceResis(refs);
        } else {
          // Generate dari unique references di details
          const uniqueRefs = Array.from(new Set(data.data.details.map((d: DetailRow) => d.reference)));
          const generatedRefs = uniqueRefs.map((ref) => ({
            reference: String(ref),
            resi_number: null,
            cost: null,
            ppn: null,
          }));
          setReferenceResis(generatedRefs);
        }
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

  const uniqueReferences = Array.from(new Set(details.map((d) => d.reference)));

  const addReferenceResi = () => {
    const usedReferences = referenceResis.map((r) => r.reference);
    const availableRefs = uniqueReferences.filter((ref) => !usedReferences.includes(ref));

    if (availableRefs.length === 0) {
      showToast.warning("Semua reference sudah memiliki nomor resi");
      return;
    }

    setReferenceResis([
      ...referenceResis,
      { reference: String(availableRefs[0]), resi_number: null, cost: null, ppn: null },
    ]);
  };

  const removeReferenceResi = (index: number) => {
    const newResis = [...referenceResis];
    newResis.splice(index, 1);
    setReferenceResis(newResis);
  };

  const updateReferenceResi = (index: number, field: keyof ReferenceResi, value: string | number | null) => {
    const newResis = [...referenceResis];
    newResis[index] = { ...newResis[index], [field]: value };
    setReferenceResis(newResis);
  };

  const handleSave = async () => {
    const emptyResi = referenceResis.some((r) => !r.resi_number?.trim());
    if (emptyResi) {
      showToast.warning("Semua nomor resi harus diisi");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        delivered_status: deliveredStatus,
        arrive_date: arriveDate ? new Date(arriveDate).toISOString() : null,
        reference_price: referencePrice || null,
        references: referenceResis.map((ref) => ({
          reference: ref.reference,
          resi_number: ref.resi_number,
          cost: ref.cost,
          ppn: ref.ppn,
        })),
      };

      const res = await fetch(`/api/b2b/manifest/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast.success("✅ Manifest berhasil diupdate");
        fetchDetail();
      } else {
        showToast.error(result.message || "Gagal update manifest");
      }
    } catch (error) {
      console.error("Error saving manifest:", error);
      showToast.error("Error menyimpan manifest");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkArrived = () => {
    setDeliveredStatus("arrived");
    if (!arriveDate) {
      setArriveDate(toDatetimeLocal(new Date().toISOString()));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/b2b/manifest/${params.id}/export`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal export data");
      }

      const data = await res.json();
      const rows = data.data || [];

      if (rows.length === 0) {
        showToast.warning("Tidak ada data untuk di-export");
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
        `putaway_${manifest?.delivery_number || params.id}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast.success(`✅ Export ${rows.length} data berhasil`);
    } catch (error) {
      console.error("Export error:", error);
      showToast.error(error instanceof Error ? error.message : "Error export data");
    } finally {
      setExporting(false);
    }
  };

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

  const referenceGroups = details.reduce<Record<string, DetailRow[]>>((acc, d) => {
    acc[d.reference] = acc[d.reference] || [];
    acc[d.reference].push(d);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
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
            onClick={handleExport}
            disabled={exporting || details.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            onClick={() => window.open(`/print/b2b-manifest/${manifest.id}`, "_blank")}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Surat Jalan
          </button>
        </div>
      </div>

      {/* Info ringkas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-slate-800">{manifest.total_box}</p>
          <p className="text-xs text-slate-500">Total Box</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-slate-800">
            {Number(manifest.total_weight).toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-slate-500">Total Berat (kg)</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-sm font-bold text-slate-800">
            {new Date(manifest.loading_date).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="text-xs text-slate-500">Tgl Loading</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          {manifest.delivered_status === "arrived" ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
              <PackageCheck className="w-3 h-3" /> Arrived
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
              <Truck className="w-3 h-3" /> On The Way
            </span>
          )}
        </div>
      </div>

      {/* Form Update */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Update Status &amp; Biaya per Reference
          </h2>
          {manifest.delivered_status !== "arrived" && (
            <button
              onClick={handleMarkArrived}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              ✅ Tandai Arrived Sekarang
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Status Pengiriman
            </label>
            <select
              value={deliveredStatus}
              onChange={(e) => setDeliveredStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
            >
              <option value="on_the_way">On The Way</option>
              <option value="arrived">Arrived</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Tanggal Tiba
            </label>
            <input
              type="datetime-local"
              value={arriveDate}
              onChange={(e) => setArriveDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
            />
          </div>
        </div>

        {/* Multiple Resi per Reference dengan Cost & PPN */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Nomor Resi &amp; Biaya per Reference
            </label>
            <button
              onClick={addReferenceResi}
              disabled={referenceResis.length >= uniqueReferences.length}
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3 h-3" /> Tambah Resi
            </button>
          </div>

          {referenceResis.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Belum ada nomor resi. Klik "Tambah Resi" untuk menambahkan.
            </p>
          ) : (
            <div className="space-y-3">
              {referenceResis.map((item, index) => (
                <div key={index} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <select
                      value={item.reference}
                      onChange={(e) => updateReferenceResi(index, "reference", e.target.value)}
                      className="w-48 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
                    >
                      {uniqueReferences.map((ref) => (
                        <option key={ref} value={ref}>
                          {ref}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={item.resi_number || ""}
                      onChange={(e) => updateReferenceResi(index, "resi_number", e.target.value)}
                      placeholder="Masukkan nomor resi"
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
                    />
                    <button
                      onClick={() => removeReferenceResi(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-3 ml-1">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">Cost</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.cost ?? ""}
                        onChange={(e) => updateReferenceResi(index, "cost", e.target.value ? Number(e.target.value) : null)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">PPN</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.ppn ?? ""}
                        onChange={(e) => updateReferenceResi(index, "ppn", e.target.value ? Number(e.target.value) : null)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reference Price Global */}
        <div className="border-t border-slate-200 pt-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Reference Price (Global)
            </label>
            <select
              value={referencePrice}
              onChange={(e) => setReferencePrice(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent"
            >
              <option value="">Pilih tipe</option>
              <option value="berat">Berat</option>
              <option value="volume">Volume</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-[#0B2B4A] hover:bg-[#123a5e] text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      {/* Detail per reference */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Detail Box per Reference
          </h2>
          <span className="text-xs text-slate-400">{details.length} box total</span>
        </div>
        <div className="divide-y divide-slate-100">
          {Object.entries(referenceGroups).map(([ref, rows]) => {
            const resi = referenceResis.find((r) => r.reference === ref);
            return (
              <div key={ref} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono font-bold text-sm text-slate-800">
                    {ref}{" "}
                    <span className="text-slate-400 font-normal">({rows.length} box)</span>
                  </p>
                  {resi?.resi_number && (
                    <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                      Resi: {resi.resi_number}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 uppercase tracking-wide">
                        <th className="text-left py-1 pr-3">Box ID</th>
                        <th className="text-left py-1 pr-3">Berat</th>
                        <th className="text-left py-1 pr-3">Toko</th>
                        <th className="text-left py-1 pr-3">Driver</th>
                        <th className="text-left py-1 pr-3">No. Polisi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.map((r) => (
                        <tr key={r.box_id}>
                          <td className="py-1.5 pr-3 font-mono">{r.box_id}</td>
                          <td className="py-1.5 pr-3">{r.weight} kg</td>
                          <td className="py-1.5 pr-3">{r.store_name}</td>
                          <td className="py-1.5 pr-3">{r.driver || "-"}</td>
                          <td className="py-1.5 pr-3">{r.police_number || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}