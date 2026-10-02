"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Search,
  MapPin,
  Package,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Truck,
  FileText,
  Zap,
} from "lucide-react";
import { formatWIB } from '@/lib/date';
import showToast from '@/lib/toast';
import { playAcceptedSound, playRejectedSound } from "@/lib/sound";
import OperatorShell from "@/components/mobile/OperatorShell";

interface PackageInfo {
  barcode_resi: string;
  location_code: string;
  status: string;
  putaway_at: string;
  putaway_by_name: string;
  picked_at: string | null;
  picked_by_name: string | null;
  session_code: string;
  transporter_name: string;
}

export default function PickupPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PackageInfo[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageInfo | null>(null);
  const [step, setStep] = useState<"search" | "detail">("search");
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [isTyping, setIsTyping] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`/api/pickup/search?q=${encodeURIComponent(query)}&mode=suggest`, {
        credentials: 'include',
      });
      const result = await res.json();

      if (res.ok && result.success && result.mode === 'suggest') {
        setSuggestions(result.data || []);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.length >= 2) {
      setIsTyping(true);
      debounceTimer.current = setTimeout(() => {
        fetchSuggestions(searchQuery);
        setIsTyping(false);
      }, 300);
    } else {
      setSuggestions([]);
      setIsTyping(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, fetchSuggestions]);

  const handleExactSearch = async () => {
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) {
      showToast.error("Masukkan barcode terlebih dahulu");
      return;
    }

    setLoading(true);
    setStatusMsg({ text: "🔍 Mencari...", type: "info" });

    try {
      const res = await fetch(`/api/pickup/search?q=${encodeURIComponent(cleanQuery)}&mode=search`, {
        credentials: 'include',
      });
      const result = await res.json();

      if (res.ok && result.success && result.mode === 'search') {
        const pkg = result.data;

        if (pkg.status === 'PICKED' || pkg.status === 'COMPLETED') {
          setStatusMsg({
            text: `⚠️ Paket sudah diambil pada ${formatWIB(pkg.picked_at)}`,
            type: "error"
          });
          playRejectedSound();
          return;
        }

        setSelectedPackage(pkg);
        setStep("detail");
        setStatusMsg({
          text: `📍 Paket ditemukan di ${pkg.location_code}`,
          type: "success"
        });
        playAcceptedSound();
        setSuggestions([]);
      } else {
        setStatusMsg({
          text: `❌ ${result.message || "Paket tidak ditemukan"}`,
          type: "error"
        });
        playRejectedSound();
        setSelectedPackage(null);
      }
    } catch (error) {
      playRejectedSound();
      showToast.error("Error searching package");
      setStatusMsg({ text: "❌ Error server", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (pkg: PackageInfo) => {
    setSelectedPackage(pkg);
    setSearchQuery(pkg.barcode_resi);
    setSuggestions([]);
    setStep("detail");
    setStatusMsg({
      text: `📍 Paket ditemukan di ${pkg.location_code}`,
      type: "success"
    });
    playAcceptedSound();
  };

  const handlePickup = async () => {
    if (!selectedPackage) return;

    setLoading(true);
    setStatusMsg({ text: "⏳ Mengambil paket...", type: "info" });

    try {
      const res = await fetch("/api/pickup/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: selectedPackage.barcode_resi,
        }),
        credentials: 'include',
      });

      const result = await res.json();

      if (res.ok && result.success) {
        playAcceptedSound();
        showToast.success(result.message);
        setStatusMsg({ text: `✅ ${result.message}`, type: "success" });

        setTimeout(() => {
          setStep("search");
          setSelectedPackage(null);
          setSearchQuery("");
          setSuggestions([]);
          setStatusMsg({ text: "", type: "" });
          inputRef.current?.focus();
        }, 1500);
      } else {
        playRejectedSound();
        showToast.error(result.message || "Gagal mengambil paket");
        setStatusMsg({ text: `❌ ${result.message || "Gagal"}`, type: "error" });
      }
    } catch (error) {
      playRejectedSound();
      showToast.error("Error processing pickup");
      setStatusMsg({ text: "❌ Error server", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "detail") {
      setStep("search");
      setSelectedPackage(null);
      setStatusMsg({ text: "", type: "" });
      setSearchQuery("");
      setSuggestions([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      router.push("/menu");
    }
  };

  // =============================================
  // RENDER: Search
  // =============================================
  if (step === "search") {
    return (
      <OperatorShell>
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-md mx-auto p-4 space-y-4">

            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-white rounded-xl transition-colors border border-slate-200 bg-white"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-widest">
                  Pickup
                </p>
                <p className="font-extrabold text-lg text-slate-900 leading-tight">
                  Ambil Paket
                </p>
              </div>
            </div>

            {/* Status */}
            {statusMsg.text && (
              <div className={`p-3 rounded-2xl border-2 text-sm font-bold flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : statusMsg.type === "error"
                  ? "bg-rose-50 text-rose-800 border-rose-300"
                  : "bg-blue-50 text-blue-800 border-blue-300"
              }`}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {statusMsg.text}
              </div>
            )}

            {/* Search Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Search className="w-4 h-4" />
                Cari Resi / AWB
              </div>

              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  autoFocus
                  disabled={loading}
                  placeholder="Scan atau ketik barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (suggestions.length > 0) {
                        handleSelectSuggestion(suggestions[0]);
                      } else {
                        handleExactSearch();
                      }
                    }
                  }}
                  className="w-full px-4 py-4 pr-14 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-mono text-lg font-bold focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all disabled:opacity-50 text-center"
                />
                <button
                  onClick={handleExactSearch}
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white rounded-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                💡 Ketik minimal 2 karakter untuk melihat rekomendasi
              </p>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {suggestions.length} rekomendasi
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {suggestions.map((pkg) => (
                    <div
                      key={pkg.barcode_resi}
                      onClick={() => handleSelectSuggestion(pkg)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors active:bg-blue-100"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-bold text-slate-800 text-sm truncate">
                            {pkg.barcode_resi}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold">
                              <MapPin className="w-3 h-3" />
                              {pkg.location_code}
                            </span>
                            <span className="text-[11px] text-emerald-600 font-medium truncate">
                              {pkg.transporter_name}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                            {pkg.status}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(pkg.putaway_at).toLocaleTimeString('id-ID')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isTyping && (
              <div className="text-center py-2 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                <span className="text-xs text-slate-400">Mencari...</span>
              </div>
            )}

            <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
              nusaena v1 · PICKUP
            </footer>
          </div>
        </div>
      </OperatorShell>
    );
  }

  // =============================================
  // RENDER: Detail Paket
  // =============================================
  if (step === "detail" && selectedPackage) {
    return (
      <OperatorShell>
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-md mx-auto p-4 space-y-4">

            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-white rounded-xl transition-colors border border-slate-200 bg-white"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-widest">
                  Pickup
                </p>
                <p className="font-extrabold text-lg text-slate-900 leading-tight">
                  Detail Paket
                </p>
              </div>
            </div>

            {/* Status */}
            {statusMsg.text && (
              <div className={`p-3 rounded-2xl border-2 text-sm font-bold flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : statusMsg.type === "error"
                  ? "bg-rose-50 text-rose-800 border-rose-300"
                  : "bg-blue-50 text-blue-800 border-blue-300"
              }`}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {statusMsg.text}
              </div>
            )}

            {/* Detail Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Header Card */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-bold text-white">Paket Ditemukan</p>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    AWB
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm truncate ml-3">
                    {selectedPackage.barcode_resi}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Lokasi
                  </span>
                  <span className="font-extrabold text-[#0B2B4A] text-lg">
                    {selectedPackage.location_code}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Status
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold">
                    {selectedPackage.status}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Session
                  </span>
                  <span className="font-mono text-xs text-slate-700 truncate ml-3">
                    {selectedPackage.session_code}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    Transporter
                  </span>
                  <span className="text-xs text-slate-700 font-medium truncate ml-3">
                    {selectedPackage.transporter_name}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Disimpan oleh
                  </span>
                  <span className="text-xs text-slate-700 font-medium truncate ml-3">
                    {selectedPackage.putaway_by_name}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Waktu simpan
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(selectedPackage.putaway_at).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Tombol Ambil */}
            <button
              onClick={handlePickup}
              disabled={loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-base tracking-wide shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all uppercase disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  Ambil Paket
                </>
              )}
            </button>

            {/* Info Auto Sign */}
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-800 mb-1">Auto Sign</p>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Paket akan otomatis terambil dan tercatat di history. Tanpa perlu tanda tangan manual.
                  </p>
                </div>
              </div>
            </div>

            <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
              nusaena v1 · PICKUP
            </footer>
          </div>
        </div>
      </OperatorShell>
    );
  }

  return null;
}