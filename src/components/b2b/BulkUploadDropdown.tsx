// src/components/b2b/BulkUploadDropdown.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  Plus,
  Upload,
} from 'lucide-react';

interface BulkUploadDropdownProps {
  onBulkUpload?: () => void;
  onManualCreate?: () => void;
}

export default function BulkUploadDropdown({
  onBulkUpload,
  onManualCreate,
}: BulkUploadDropdownProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleDownloadTemplate() {
    setDownloading(true);

    try {
      const res = await fetch('/api/b2b/putaway/template');

      if (!res.ok) {
        throw new Error('Gagal download template');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;

      let filename = `template-putaway-b2b-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      const disposition = res.headers.get('Content-Disposition');
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal download template');
    } finally {
      setDownloading(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Aksi Putaway
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <button
            onClick={handleDownloadTemplate}
            disabled={downloading}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-slate-400" />
            <div>
              <p className="font-medium">
                {downloading ? 'Mengunduh...' : 'Download Template'}
              </p>
              <p className="text-xs text-slate-400">
                Format .xlsx + sheet Petunjuk
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onBulkUpload?.();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-4 w-4 text-slate-400" />
            <div>
              <p className="font-medium">Bulk Upload</p>
              <p className="text-xs text-slate-400">
                Upload Excel, max 1000 baris
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onManualCreate?.();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4 text-slate-400" />
            <div>
              <p className="font-medium">Manual Create</p>
              <p className="text-xs text-slate-400">
                Input 1 box secara manual
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}