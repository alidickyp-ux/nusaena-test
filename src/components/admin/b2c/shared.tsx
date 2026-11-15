"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  RefreshCw,
  Search,
} from "lucide-react";
import showToast from "@/lib/toast";
import { formatTime, shiftDate, toDateString } from "@/lib/format";
import type { Pagination } from "./types";

// Warna brand dipusatkan di sini. Nanti bisa diganti ke token `brand` di tailwind.config.
export const CARD = "bg-white rounded-2xl border border-slate-200 shadow-sm";
export const CHIP_ACTIVE = "bg-[#0B2B4A] text-white shadow-md shadow-[#0B2B4A]/20";
export const CHIP_IDLE = "bg-slate-100 text-slate-600 hover:bg-slate-200";
const INPUT =
  "bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all";

// =========================================================
// Stat card (bisa diklik sebagai filter)
// =========================================================
const TONES = {
  slate: { border: "border-slate-200", text: "text-slate-800", ring: "ring-slate-400" },
  emerald: { border: "border-emerald-200", text: "text-emerald-600", ring: "ring-emerald-400" },
  amber: { border: "border-amber-200", text: "text-amber-600", ring: "ring-amber-400" },
  rose: { border: "border-rose-200", text: "text-rose-600", ring: "ring-rose-400" },
  blue: { border: "border-blue-200", text: "text-blue-600", ring: "ring-blue-400" },
  orange: { border: "border-orange-200", text: "text-orange-600", ring: "ring-orange-400" },
} as const;

export function StatCard({
  label,
  value,
  tone = "slate",
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  tone?: keyof typeof TONES;
  active?: boolean;
  onClick?: () => void;
}) {
  const t = TONES[tone];
  const base = `bg-white p-3 rounded-2xl border shadow-sm text-center transition-all ${t.border} ${
    active ? `ring-2 ${t.ring}` : ""
  }`;
  const content = (
    <>
      <p className={`text-2xl font-extrabold leading-none ${t.text}`}>{value.toLocaleString("id-ID")}</p>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">{label}</p>
    </>
  );

  if (!onClick) return <div className={base}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${base} w-full hover:shadow-md`}
    >
      {content}
    </button>
  );
}

// =========================================================
// Pencarian & filter
// =========================================================
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex-1 relative min-w-[200px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
      <input
        type="text"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-10 pr-4 py-2.5 ${INPUT}`}
      />
    </div>
  );
}

export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
            value === o.value ? CHIP_ACTIVE : CHIP_IDLE
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const today = toDateString();
  const yesterday = shiftDate(today, -1);
  const presets = [
    { label: "Hari ini", from: today, to: today },
    { label: "Kemarin", from: yesterday, to: yesterday },
    { label: "7 Hari", from: shiftDate(today, -6), to: today },
    { label: "Semua", from: "", to: "" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Rentang tanggal cepat" className="flex gap-1.5">
        {presets.map((p) => {
          const active = p.from === from && p.to === to;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(p.from, p.to)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                active ? CHIP_ACTIVE : CHIP_IDLE
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          aria-label="Dari tanggal"
          value={from}
          max={to || undefined}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v, v && to && v > to ? v : to);
          }}
          className={`px-2.5 py-2 ${INPUT}`}
        />
        <span className="text-xs text-slate-400">s/d</span>
        <input
          type="date"
          aria-label="Sampai tanggal"
          value={to}
          min={from || undefined}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v && from && v < from ? v : from, v);
          }}
          className={`px-2.5 py-2 ${INPUT}`}
        />
      </div>
    </div>
  );
}

// =========================================================
// Aksi: refresh, export, salin
// =========================================================
export function RefreshControls({
  lastUpdated,
  busy,
  pollMs,
  onRefresh,
}: {
  lastUpdated: Date | null;
  busy: boolean;
  pollMs: number;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {lastUpdated && (
        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
          Diperbarui {formatTime(lastUpdated)}
          {pollMs > 0 && ` · otomatis tiap ${Math.round(pollMs / 1000)} dtk`}
        </span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        title="Muat ulang"
        aria-label="Muat ulang data"
        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}

export function ExportButton({
  label,
  exporting,
  onClick,
}: {
  label: string;
  exporting: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={exporting}
      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
    >
      {exporting ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          Mengekspor...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          {label}
        </>
      )}
    </button>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast.error("Gagal menyalin");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Salin"
      aria-label={`Salin ${text}`}
      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// =========================================================
// Error, tabel, pagination
// =========================================================
export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-4 py-3"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        {message}
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors"
      >
        Coba lagi
      </button>
    </div>
  );
}

export interface Column {
  label: string;
  align?: "left" | "right";
  title?: string;
}

export function TableShell({
  columns,
  loading,
  error,
  isEmpty,
  emptyIcon: EmptyIcon,
  emptyText,
  children,
  footer,
}: {
  columns: Column[];
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyIcon: ComponentType<{ className?: string }>;
  emptyText: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const colSpan = columns.length;

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div
        className={`overflow-x-auto transition-opacity ${
          loading && !isEmpty ? "opacity-50 pointer-events-none" : ""
        }`}
        aria-busy={loading}
      >
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((c) => (
                <th
                  key={c.label}
                  title={c.title}
                  scope="col"
                  className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${
                    c.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isEmpty && loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#0B2B4A] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : isEmpty && error ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="w-8 h-8 text-rose-300" />
                    <span className="text-sm text-slate-500 font-medium">Data tidak dapat ditampilkan</span>
                  </div>
                </td>
              </tr>
            ) : isEmpty ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <EmptyIcon className="w-8 h-8 text-slate-300" />
                    <span className="text-sm text-slate-500 font-medium">{emptyText}</span>
                  </div>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

export function PaginationBar({
  pagination,
  onPageChange,
}: {
  pagination: Pagination | null;
  onPageChange: (page: number) => void;
}) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, hasPrev, hasNext, limit, total } = pagination;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
      <div className="text-xs text-slate-500 font-medium">
        Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} dari {total} data
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Halaman sebelumnya"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          className={`p-2 rounded-lg text-sm transition-colors ${
            hasPrev ? "hover:bg-slate-200 text-slate-700" : "text-slate-300 cursor-not-allowed"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-500 px-2 font-bold">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          aria-label="Halaman berikutnya"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className={`p-2 rounded-lg text-sm transition-colors ${
            hasNext ? "hover:bg-slate-200 text-slate-700" : "text-slate-300 cursor-not-allowed"
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}