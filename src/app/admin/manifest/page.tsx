import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import ManifestTab from "@/components/admin/b2c/ManifestTab";

export default function ManifestPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/admin/b2c?tab=manifest"
          className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Operasional B2C
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0B2B4A] to-[#1a3d5c] flex items-center justify-center shadow-lg shadow-[#0B2B4A]/20 flex-shrink-0">
            <FileText className="w-5 h-5 text-white" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Handover Manifest</h1>
            <p className="text-xs text-slate-500 font-medium">
              Daftar berita acara serah terima yang sudah ditandatangani
            </p>
          </div>
        </div>
      </div>

      {/* Filter, ringkasan, tabel, dan pagination ada di komponen yang sama dengan tab B2C.
          Ubah pollMs (ms) kalau ingin daftar ini muncul otomatis diperbarui. */}
      <ManifestTab pollMs={0} />
    </div>
  );
}