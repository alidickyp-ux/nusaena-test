// src/components/b2b/BulkUploadModal.tsx
'use client';

import { useCallback, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import showToast from '@/lib/toast';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PreviewRow {
  reference?: string;
  site?: string;
  weight?: string | number;
  volume?: string | number;
  brand?: string;
  store_name?: string;
}

interface RowError {
  row: number;
  reference?: string;
  error: string;
}

interface SuccessRow {
  row: number;
  id: string;
  reference: string;
  box_id: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  summary: {
    total_rows: number;
    success_count: number;
    failed_count: number;
  };
  errors: RowError[];
  inserted: SuccessRow[];
}

const MAX_SIZE_MB = 5;
const MAX_ROWS = 1000;
const ALLOWED_EXT = ['xlsx', 'xls', 'csv'];

type UploadState = 'idle' | 'preview' | 'uploading' | 'result';

export default function BulkUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset saat modal ditutup
  const handleClose = () => {
    if (uploadState === 'uploading') return; // jangan bisa ditutup saat upload
    setFile(null);
    setPreview([]);
    setTotalRows(0);
    setUploadState('idle');
    setProgress(0);
    setResult(null);
    setIsDragging(false);
    onClose();
  };

  // =============================================
  // 🔥 PARSE & VALIDASI FILE
  // =============================================
  const processFile = useCallback(async (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_EXT.includes(ext)) {
      showToast.error(`Format harus .${ALLOWED_EXT.join(', .')}`);
      return;
    }

    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast.error(`Ukuran file maksimal ${MAX_SIZE_MB} MB`);
      return;
    }

    try {
      const buffer = await f.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<PreviewRow>(sheet);

      if (rows.length === 0) {
        showToast.error('File kosong atau tidak ada data');
        return;
      }

      if (rows.length > MAX_ROWS) {
        showToast.error(
          `Maksimal ${MAX_ROWS} baris per upload. File Anda: ${rows.length} baris`
        );
        return;
      }

      const headers = Object.keys(rows[0] || {});
      const required = ['reference', 'site'];
      const missing = required.filter((h) => !headers.includes(h));

      if (missing.length > 0) {
        showToast.error(`Kolom wajib tidak ditemukan: ${missing.join(', ')}`);
        return;
      }

      setFile(f);
      setPreview(rows.slice(0, 10));
      setTotalRows(rows.length);
      setUploadState('preview');
    } catch (err) {
      console.error('Parse error:', err);
      showToast.error('Gagal membaca file Excel');
    }
  }, []);

  // =============================================
  // 🔥 DRAG & DROP
  // =============================================
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  // =============================================
  // 🔥 DOWNLOAD TEMPLATE (dari dalam modal)
  // =============================================
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const res = await fetch('/api/b2b/putaway/template', { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal download template');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      let filename = `template-putaway-b2b-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      const disposition = res.headers.get('Content-Disposition');
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      showToast.error('Gagal download template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // =============================================
  // 🔥 UPLOAD KE API
  // =============================================
  const handleUpload = async () => {
    if (!file) return;

    setUploadState('uploading');
    setProgress(0);

    // Progress animasi (simulasi 0-90%)
    const progressInterval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + Math.random() * 8));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/b2b/putaway/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data: UploadResult = await res.json();

      // Sedikit delay biar 100% terlihat
      await new Promise((r) => setTimeout(r, 400));

      setResult(data);
      setUploadState('result');

      if (data.success && data.summary.success_count > 0) {
        showToast.success(
          `✅ ${data.summary.success_count} berhasil, ${data.summary.failed_count} gagal`
        );
        onSuccess?.();
      } else {
        showToast.error(data.message || 'Upload gagal');
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Upload error:', err);
      showToast.error('Terjadi kesalahan saat upload');
      setUploadState('preview');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Bulk Upload Putaway
              </h3>
              <p className="text-xs text-slate-500">
                Maksimal {MAX_ROWS} baris · Format .xlsx / .xls / .csv · Max {MAX_SIZE_MB} MB
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={uploadState === 'uploading'}
            className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-40"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ============================================= */}
          {/* STATE: IDLE — drag & drop */}
          {/* ============================================= */}
          {uploadState === 'idle' && (
            <>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                    <UploadCloud className="h-7 w-7 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Drag & drop file di sini
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      atau klik untuk pilih file
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    Format: .xlsx, .xls, .csv (Max {MAX_SIZE_MB} MB)
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* Bantuan & Template */}
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">
                      Belum punya template?
                    </p>
                    <p className="mt-0.5 text-xs text-amber-700">
                      Download template resmi dengan sheet &quot;Petunjuk&quot; agar kolom sesuai.
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadTemplate();
                    }}
                    disabled={isDownloadingTemplate}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {isDownloadingTemplate ? 'Mengunduh...' : 'Template'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ============================================= */}
          {/* STATE: PREVIEW */}
          {/* ============================================= */}
          {uploadState === 'preview' && (
            <>
              {/* Info file */}
              <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {file?.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {totalRows} baris ·{' '}
                      {file ? (file.size / 1024).toFixed(1) : 0} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview([]);
                    setTotalRows(0);
                    setUploadState('idle');
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200"
                >
                  Ganti File
                </button>
              </div>

              {/* Preview table */}
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Preview {preview.length} dari {totalRows} baris
                </p>
                {totalRows > preview.length && (
                  <p className="text-xs text-slate-400">
                    Menampilkan {preview.length} baris pertama
                  </p>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Reference</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Site</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Weight</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Volume</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Brand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">
                          {row.reference || '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{row.site || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{row.weight || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{row.volume || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{row.brand || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Info validasi */}
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs text-blue-800">
                  ✅ Baris yang tidak valid akan <b>di-skip</b> dan ditampilkan di pop-up hasil.
                  Baris yang valid tetap diupload.
                </p>
              </div>
            </>
          )}

          {/* ============================================= */}
          {/* STATE: UPLOADING */}
          {/* ============================================= */}
          {uploadState === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
              <p className="mt-4 text-sm font-semibold text-slate-700">
                Mengupload data...
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Mohon jangan tutup jendela ini
              </p>

              <div className="mt-6 w-full max-w-md">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-200"
                    style={{ width: `${Math.round(progress)}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-xs font-medium text-slate-600">
                  {Math.round(progress)}%
                </p>
              </div>
            </div>
          )}

          {/* ============================================= */}
          {/* STATE: RESULT */}
          {/* ============================================= */}
          {uploadState === 'result' && result && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Total
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-800">
                    {result.summary.total_rows}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase text-emerald-600">
                    Berhasil
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    {result.summary.success_count}
                  </p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase text-rose-600">
                    Gagal
                  </p>
                  <p className="mt-1 text-2xl font-bold text-rose-700">
                    {result.summary.failed_count}
                  </p>
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <p className="text-sm font-semibold text-slate-700">
                      Detail Error ({result.errors.length})
                    </p>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-rose-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-rose-700">
                            Baris
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-rose-700">
                            Reference
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-rose-700">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-200">
                        {result.errors.map((err, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-mono text-rose-800">
                              {err.row}
                            </td>
                            <td className="px-3 py-2 font-mono text-rose-800">
                              {err.reference || '-'}
                            </td>
                            <td className="px-3 py-2 text-rose-700">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Success message */}
              {result.errors.length === 0 && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-800">
                    Semua data berhasil diupload! 🎉
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          {uploadState === 'idle' && (
            <button
              onClick={handleClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
          )}

          {uploadState === 'preview' && (
            <>
              <button
                onClick={() => {
                  setFile(null);
                  setPreview([]);
                  setTotalRows(0);
                  setUploadState('idle');
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Ganti File
              </button>
              <button
                onClick={handleUpload}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Upload className="h-4 w-4" />
                Upload {totalRows} Baris
              </button>
            </>
          )}

          {uploadState === 'result' && (
            <>
              <button
                onClick={handleClose}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  setPreview([]);
                  setTotalRows(0);
                  setProgress(0);
                  setResult(null);
                  setUploadState('idle');
                }}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Upload File Lain
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}