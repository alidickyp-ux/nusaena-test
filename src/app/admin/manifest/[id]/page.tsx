"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Download,
  Package,
  Printer,
  XCircle,
} from "lucide-react";
import showToast from "@/lib/toast";
import { downloadFromApi } from "@/lib/download";
import { formatDateTime } from "@/lib/format";
import ManifestPrint from "@/components/admin/ManifestPrint";
import {
  CARD,
  CopyButton,
  ErrorBanner,
  ExportButton,
  SearchInput,
  StatCard,
} from "@/components/admin/b2c/shared";

interface ManifestData {
  id: string;
  session_id: string;
  session_code: string;
  transporter_name: string;
  operator_name: string;
  courier_name: string;
  security_name: string;
  vehicle_number: string;
  total_packages_handed: number;
  total_discrepancy: number;
  signed_at: string;
  courier_signature: string | null;
  security_signature: string | null;
  courier_photo_url: string | null;
}

interface HistoryLog {
  id: string;
  session_code: string;
  transporter_name: string;
  resi_number: string;
  sorting_at: string;
  sorting_by: string;
  handover_at: string;
  handover_by: string;
  status: string;
}

type StatusFilter = "all" | "DONE" | "CANCELLED" | "NOT_FOUND";

const FALLBACK_PATH = "/admin/b2c?tab=manifest";
const LABEL = "text-[10px] text-slate-400 uppercase tracking-wider font-bold";
const BACK_BUTTON =
  "inline-flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold shadow-sm transition-colors";

/** Tanda tangan bisa berupa data URL, URL biasa, atau base64 mentah. */
function signatureSrc(value: string | null): string | null {
  if (!value) return null;
  if (/^(data:|https?:\/\/|\/)/.test(value)) return value;
  return `data:image/png;base64,${value}`;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "DONE":
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit">
          <CheckCircle className="w-3 h-3" /> Done
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit">
          <AlertCircle className="w-3 h-3" /> Cancel
        </span>
      );
    case "NOT_FOUND":
      return (
        <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit">
          <XCircle className="w-3 h-3" /> Not Found
        </span>
      );
    default:
      return <span className="text-[10px] text-slate-500 font-medium">{status}</span>;
  }
}

export default function ManifestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showPrint, setShowPrint] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Kembali ke halaman asal (tab B2C atau daftar manifest); kalau dibuka langsung, ke tab Manifest B2C.
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(FALLBACK_PATH);
  };

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/manifest/${id}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (res.status === 404) {
          setManifest(null);
          setHistoryLogs([]);
          return;
        }

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.manifest) {
          throw new Error(json?.message || `Gagal memuat detail manifest (HTTP ${res.status})`);
        }

        setManifest(json.manifest);
        setHistoryLogs(json.history_logs ?? []);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Terjadi kesalahan saat memuat detail manifest");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id, reloadKey]);

  const counts = useMemo(
    () => ({
      done: historyLogs.filter((h) => h.status === "DONE").length,
      cancelled: historyLogs.filter((h) => h.status === "CANCELLED").length,
      notFound: historyLogs.filter((h) => h.status === "NOT_FOUND").length,
    }),
    [historyLogs]
  );

  const filteredLogs = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return historyLogs.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (l.resi_number ?? "").toLowerCase().includes(q) ||
        (l.sorting_by ?? "").toLowerCase().includes(q) ||
        (l.handover_by ?? "").toLowerCase().includes(q)
      );
    });
  }, [historyLogs, searchInput, statusFilter]);

  const toggleStatus = (value: Exclude<StatusFilter, "all">) =>
    setStatusFilter((cur) => (cur === value ? "all" : value));

  const handleExportExcel = async () => {
    if (!manifest) return;
    setExporting(true);
    try {
      await downloadFromApi(
        `/api/manifest/${manifest.id}/export`,
        `manifest-${manifest.session_code || manifest.id}.xlsx`
      );
      showToast.success("Excel berhasil diunduh");
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : "Gagal export excel");
    } finally {
      setExporting(false);
    }
  };

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#0B2B4A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium mt-3">Memuat detail manifest...</p>
        </div>
      </div>
    );
  }

  // ---------- Error / tidak ditemukan ----------
  if (!manifest) {
    return (
      <div className="space-y-5">
        <button type="button" onClick={goBack} className={BACK_BUTTON}>
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Kembali
        </button>

        {error ? (
          <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : (
          <div className={`${CARD} px-4 py-12 text-center`}>
            <p className="text-sm font-bold text-slate-700">Manifest tidak ditemukan</p>
            <p className="text-xs text-slate-500 mt-1">
              Data mungkin sudah dihapus atau tautan yang dibuka tidak lengkap.
            </p>
          </div>
        )}
      </div>
    );
  }

  const handed = Number(manifest.total_packages_handed) || 0;
  const disc = Number(manifest.total_discrepancy) || 0;
  const photoUrl = manifest.courier_photo_url;
  const signatures = [
    { label: "Kurir", name: manifest.courier_name, src: signatureSrc(manifest.courier_signature) },
    { label: "Security", name: manifest.security_name, src: signatureSrc(manifest.security_signature) },
  ];
  const hasSignature = signatures.some((s) => s.src);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={goBack} className={BACK_BUTTON}>
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Kembali
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight font-mono">
              {manifest.session_code}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Bukti Serah Terima - {manifest.transporter_name || "-"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
              {handed - disc} / {handed} paket sesuai
            </span>
            {disc > 0 && (
              <span className="text-[11px] font-bold bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full">
                {disc} discrepancy
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton label="Export Excel" exporting={exporting} onClick={handleExportExcel} />
          <button
            type="button"
            onClick={() => setShowPrint((v) => !v)}
            aria-pressed={showPrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-violet-600/20"
          >
            <Printer className="w-4 h-4" />
            {showPrint ? "Sembunyikan Print" : "Tampilkan Print"}
          </button>
        </div>
      </div>

      {/* Info manifest */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`${CARD} p-4`}>
          <p className={LABEL}>Session</p>
          <p className="font-mono font-bold text-slate-800 mt-1">{manifest.session_code}</p>
          <p className="text-xs text-slate-500 mt-0.5">{manifest.transporter_name || "-"}</p>
        </div>
        <div className={`${CARD} p-4`}>
          <p className={LABEL}>Kurir</p>
          <p className="font-bold text-slate-800 mt-1">{manifest.courier_name || "-"}</p>
          <p className="text-xs text-slate-500 mt-0.5">Kendaraan: {manifest.vehicle_number || "-"}</p>
        </div>
        <div className={`${CARD} p-4`}>
          <p className={LABEL}>Security</p>
          <p className="font-bold text-slate-800 mt-1">{manifest.security_name || "-"}</p>
          <p className="text-xs text-slate-500 mt-0.5">Operator: {manifest.operator_name || "-"}</p>
        </div>
        <div className={`${CARD} p-4`}>
          <p className={LABEL}>Ditandatangani</p>
          <p className="font-bold text-slate-800 mt-1">{formatDateTime(manifest.signed_at)}</p>
          <p className="text-xs text-slate-500 mt-0.5">WIB</p>
        </div>
      </div>

      {/* Foto kurir dan tanda tangan */}
      {(photoUrl || hasSignature) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {photoUrl && (
            <div className={`${CARD} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <p className={LABEL}>Foto Kurir (Bukti Handover)</p>
                <a
                  href={photoUrl}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="Foto kurir saat serah terima"
                className="w-full max-w-xs max-h-64 rounded-xl border border-slate-200 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(photoUrl, "_blank", "noopener")}
              />
            </div>
          )}

          {hasSignature && (
            <div className={`${CARD} p-4`}>
              <p className={`${LABEL} mb-3`}>Tanda Tangan</p>
              <div className="grid grid-cols-2 gap-3">
                {signatures.map((s) => (
                  <div key={s.label}>
                    <p className="text-[11px] font-bold text-slate-500 mb-1.5">{s.label}</p>
                    <div className="h-24 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden">
                      {s.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.src}
                          alt={`Tanda tangan ${s.label.toLowerCase()}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">Tidak ada</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-700 mt-1.5 truncate">{s.name || "-"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistik resi: klik untuk memfilter daftar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Paket"
          value={historyLogs.length}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <StatCard
          label="Done"
          value={counts.done}
          tone="emerald"
          active={statusFilter === "DONE"}
          onClick={() => toggleStatus("DONE")}
        />
        <StatCard
          label="Cancel"
          value={counts.cancelled}
          tone="amber"
          active={statusFilter === "CANCELLED"}
          onClick={() => toggleStatus("CANCELLED")}
        />
        <StatCard
          label="Not Found"
          value={counts.notFound}
          tone="rose"
          active={statusFilter === "NOT_FOUND"}
          onClick={() => toggleStatus("NOT_FOUND")}
        />
      </div>

      {/* Daftar resi */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 sm:w-48 flex-shrink-0">
            <Package className="w-4 h-4 text-slate-400" aria-hidden />
            <h2 className="text-sm font-bold text-slate-700">Daftar Resi</h2>
            <span className="text-[11px] text-slate-500 font-medium">
              {filteredLogs.length === historyLogs.length
                ? `${historyLogs.length} resi`
                : `${filteredLogs.length} dari ${historyLogs.length}`}
            </span>
          </div>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari resi, sorting by, atau handover by..."
          />
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                {["No", "Resi Number", "Status", "Sorting By", "Handover By", "Waktu Handover"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="sticky top-0 z-[1] bg-slate-50 text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500 font-medium">
                    {historyLogs.length === 0 ? "Tidak ada data resi" : "Tidak ada resi yang cocok dengan filter"}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-slate-400 font-medium">{index + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs font-bold text-slate-800">{log.resi_number}</span>
                        <CopyButton text={log.resi_number} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <p className="text-slate-600 font-medium">{log.sorting_by || "-"}</p>
                      {log.sorting_at && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(log.sorting_at)}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">{log.handover_by || "-"}</td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.handover_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview print */}
      {showPrint && (
        <div className={`${CARD} overflow-hidden p-4`}>
          <div className="flex justify-between items-center mb-4 no-print">
            <h2 className="text-sm font-bold text-slate-700">Preview Print</h2>
            <button
              type="button"
              onClick={() => window.open(`/print/manifest/${manifest.id}`, "_blank", "noopener")}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-auto max-h-[800px]">
            <ManifestPrint manifest={manifest} historyLogs={historyLogs} />
          </div>
        </div>
      )}
    </div>
  );
}