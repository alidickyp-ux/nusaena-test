"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Printer,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package
} from "lucide-react";
import { showToast } from "@/lib/toast";
import ManifestPrint from "@/components/admin/ManifestPrint";

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
  courier_signature: string | null;   // ← tambahin
  security_signature: string | null;  // ← tambahin
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

export default function ManifestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [params.id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manifest/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setManifest(data.manifest);
        setHistoryLogs(data.history_logs || []);
      } else {
        showToast.error("Gagal memuat detail manifest");
      }
    } catch (error) {
      showToast.error("Error fetching manifest detail");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await fetch(`/api/manifest/${params.id}/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `manifest-${manifest?.session_code || params.id}.xlsx`;
        a.click();
        showToast.success("Excel berhasil didownload");
      } else {
        const error = await res.json();
        showToast.error(error.message || "Gagal export excel");
      }
    } catch (error) {
      showToast.error("Error exporting excel");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-medium"><CheckCircle className="w-3 h-3" /> Done</span>;
      case 'CANCELLED':
        return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full text-xs font-medium"><AlertCircle className="w-3 h-3" /> Cancel</span>;
      case 'NOT_FOUND':
        return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium"><XCircle className="w-3 h-3" /> Not Found</span>;
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0B2B4A] rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Manifest tidak ditemukan</p>
        <button
          onClick={() => router.push("/admin/manifest")}
          className="mt-4 px-4 py-2 bg-[#0B2B4A] text-white rounded-lg"
        >
          Kembali
        </button>
      </div>
    );
  }

  const totalGood = historyLogs.filter(h => h.status === 'DONE').length;
  const totalCancel = historyLogs.filter(h => h.status === 'CANCELLED').length;
  const totalNotFound = historyLogs.filter(h => h.status === 'NOT_FOUND').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/manifest")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {manifest.session_code}
            </h1>
            <p className="text-sm text-slate-500">
              Bukti Serah Terima - {manifest.transporter_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => setShowPrint(!showPrint)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            {showPrint ? "Sembunyikan Print" : "Tampilkan Print"}
          </button>
        </div>
      </div>

      {/* Info Manifest */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Session</p>
          <p className="font-mono font-bold text-slate-800">{manifest.session_code}</p>
          <p className="text-sm text-slate-500">{manifest.transporter_name}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Kurir</p>
          <p className="font-semibold text-slate-800">{manifest.courier_name}</p>
          <p className="text-sm text-slate-500">Kendaraan: {manifest.vehicle_number}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Security</p>
          <p className="font-semibold text-slate-800">{manifest.security_name}</p>
          <p className="text-sm text-slate-500">Operator: {manifest.operator_name}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tanda Tangan</p>
          <p className="text-sm text-slate-800">
            {new Date(manifest.signed_at).toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <Package className="w-6 h-6 text-slate-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-800">{historyLogs.length}</p>
          <p className="text-xs text-slate-500">Total Paket</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-emerald-600">{totalGood}</p>
          <p className="text-xs text-slate-500">Good</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-yellow-600">{totalCancel}</p>
          <p className="text-xs text-slate-500">Cancel</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-600">{totalNotFound}</p>
          <p className="text-xs text-slate-500">Not Found</p>
        </div>
      </div>

      {/* HISTORY LOGS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">Daftar Resi</h3>
          <span className="text-xs text-slate-500">{historyLogs.length} resi</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resi Number</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sorting By</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Handover By</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                    Tidak ada data resi
                  </td>
                </tr>
              ) : (
                historyLogs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 text-sm text-slate-500">{index + 1}</td>
                    <td className="px-4 py-2 font-mono text-sm text-slate-800">{log.resi_number}</td>
                    <td className="px-4 py-2">{getStatusBadge(log.status)}</td>
                    <td className="px-4 py-2 text-sm text-slate-600">{log.sorting_by || '-'}</td>
                    <td className="px-4 py-2 text-sm text-slate-600">{log.handover_by || '-'}</td>
                    <td className="px-4 py-2 text-sm text-slate-500">
                      {log.handover_at ? new Date(log.handover_at).toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINT VIEW */}
      {showPrint && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden p-4">
          <div className="flex justify-between items-center mb-4 no-print">
            <h3 className="font-bold text-slate-700">Preview Print</h3>
            <button
              onClick={() => window.open(`/print/manifest/${manifest.id}`, '_blank')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
            >
              <Printer className="w-4 h-4 inline mr-2" />
              Print
            </button>
          </div>
          <div className="border rounded-lg overflow-auto max-h-[800px]">
            <ManifestPrint manifest={manifest} historyLogs={historyLogs} />
          </div>
        </div>
      )}
    </div>
  );
}