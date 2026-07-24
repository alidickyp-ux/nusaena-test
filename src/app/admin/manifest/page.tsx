"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileText, 
  Download, 
  Printer, 
  Eye,
  Search,
  Calendar,
  ChevronRight
} from "lucide-react";
import showToast, { withToast } from '@/lib/toast';

interface Manifest {
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
}

export default function ManifestPage() {
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchManifests();
  }, []);

  const fetchManifests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manifest");
      if (res.ok) {
        const data = await res.json();
        setManifests(data.data || []);
      } else {
        showToast.error("Gagal memuat data manifest");
      }
    } catch (error) {
      showToast.error("Error fetching manifests");
    } finally {
      setLoading(false);
    }
  };

  const filteredManifests = manifests.filter(
    (m) =>
      m.session_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.transporter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.courier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = async (id: string) => {
    try {
      const res = await fetch(`/api/manifest/${id}/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `manifest-${id}.xlsx`;
        a.click();
        showToast.success("Excel berhasil didownload");
      }
    } catch (error) {
      showToast.error("Gagal export excel");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Handover Manifest</h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar berita acara serah terima yang sudah ditandatangani
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchManifests}
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
            placeholder="Cari manifest (session code, transporter, kurir)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Session Code
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Transporter
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Kurir / Security
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Paket / Discrepancy
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#0B2B4A] border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filteredManifests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                    {searchTerm ? "Tidak ada manifest yang sesuai" : "Belum ada manifest"}
                  </td>
                </tr>
              ) : (
                filteredManifests.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-slate-800">
                        {m.session_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {m.transporter_name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{m.courier_name}</p>
                        <p className="text-xs text-slate-500">Security: {m.security_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600">
                          {m.total_packages_handed - m.total_discrepancy}
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-600">{m.total_packages_handed}</span>
                        {m.total_discrepancy > 0 && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            {m.total_discrepancy} discrepancy
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(m.signed_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/manifest/${m.id}`}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleExportExcel(m.id)}
                          className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                          title="Export Excel"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.open(`/print/manifest/${m.id}`, '_blank')}
                          className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/admin/manifest/${m.id}`}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
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