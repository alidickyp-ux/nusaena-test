"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";
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

  // 🔥 Auto-suggest with debounce
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`/api/pickup/search?q=${encodeURIComponent(query)}&mode=suggest`);
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

  // Debounce search
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

  // 🔥 Cari exact match (enter)
  const handleExactSearch = async () => {
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) {
      showToast.error("Masukkan barcode terlebih dahulu");
      return;
    }

    setLoading(true);
    setStatusMsg({ text: "🔍 Mencari...", type: "info" });

    try {
      const res = await fetch(`/api/pickup/search?q=${encodeURIComponent(cleanQuery)}&mode=search`);
      const result = await res.json();

      if (res.ok && result.success && result.mode === 'search') {
        const pkg = result.data;
        
        // Cek apakah sudah di-pickup
        if (pkg.status === 'PICKED' || pkg.status === 'COMPLETED') {
          setStatusMsg({ 
            text: `⚠️ Paket sudah diambil pada ${new Date(pkg.picked_at).toLocaleString('id-ID')}`, 
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

  // 🔥 Pilih dari suggestions
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

  // 🔥 Ambil Paket (Auto Sign)
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
      });

      const result = await res.json();

      if (res.ok && result.success) {
        playAcceptedSound();
        showToast.success(result.message);
        setStatusMsg({ text: `✅ ${result.message}`, type: "success" });
        
        // Reset ke search setelah 1.5 detik
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
  // RENDER: Search dengan Auto-Suggest
  // =============================================
  if (step === "search") {
    return (
       <OperatorShell>  {/* 🔥 Sembunyi navigasi */}
      <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
                Pickup
              </p>
              <p className="font-extrabold text-lg text-stone-900">Ambil Paket</p>
            </div>
            <button
              onClick={handleBack}
              className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
            >
              ← Kembali
            </button>
          </div>

          {/* Status Message */}
          {statusMsg.text && (
            <div className={`p-3 rounded-xl border-2 text-sm font-bold ${
              statusMsg.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                : statusMsg.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-300"
                : "bg-blue-50 text-blue-800 border-blue-300"
            }`}>
              {statusMsg.text}
            </div>
          )}

          {/* Search Input */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200">
            <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest mb-2">
              Cari Resi / AWB
            </label>
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
                    // Jika ada suggestions, pilih yang pertama
                    if (suggestions.length > 0) {
                      handleSelectSuggestion(suggestions[0]);
                    } else {
                      handleExactSearch();
                    }
                  }
                }}
                className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-mono text-lg font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50 pr-12"
              />
              <button
                onClick={handleExactSearch}
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg active:scale-95 transition-all disabled:opacity-50"
              >
                🔍
              </button>
            </div>
            <p className="text-[10px] text-stone-400 mt-2">
              💡 Ketik minimal 2 karakter untuk melihat rekomendasi
            </p>
          </div>

          {/* 🔥 AUTO-SUGGEST RESULTS */}
          {suggestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-stone-50 border-b border-stone-200">
                <p className="text-xs font-semibold text-stone-500">
                  {suggestions.length} rekomendasi ditemukan
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-stone-100">
                {suggestions.map((pkg) => (
                  <div
                    key={pkg.barcode_resi}
                    onClick={() => handleSelectSuggestion(pkg)}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors active:bg-blue-100"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-stone-800 text-sm">
                          {pkg.barcode_resi}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-blue-600 font-medium">
                            📍 {pkg.location_code}
                          </span>
                          <span className="text-xs text-emerald-600">
                            {pkg.transporter_name}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          {pkg.status}
                        </span>
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          {new Date(pkg.putaway_at).toLocaleTimeString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isTyping && (
            <div className="text-center py-2">
              <span className="text-xs text-stone-400">🔍 Mencari...</span>
            </div>
          )}

          <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
            COOL SYSTEM V3 · PICKUP
          </footer>
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
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
                Pickup
              </p>
              <p className="font-extrabold text-lg text-stone-900">Detail Paket</p>
            </div>
            <button
              onClick={handleBack}
              className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
            >
              ← Kembali
            </button>
          </div>

          {/* Status Message */}
          {statusMsg.text && (
            <div className={`p-3 rounded-xl border-2 text-sm font-bold ${
              statusMsg.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                : statusMsg.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-300"
                : "bg-blue-50 text-blue-800 border-blue-300"
            }`}>
              {statusMsg.text}
            </div>
          )}

          {/* 🔥 Package Detail Card */}
          <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm overflow-hidden">
            <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                📦 Paket Ditemukan
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">AWB</span>
                <span className="font-mono font-bold text-stone-900 text-sm">
                  {selectedPackage.barcode_resi}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">📍 Lokasi</span>
                <span className="font-bold text-blue-600 text-lg">
                  {selectedPackage.location_code}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Status</span>
                <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-0.5 rounded-full font-medium">
                  {selectedPackage.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Session</span>
                <span className="font-mono text-sm">{selectedPackage.session_code}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Transporter</span>
                <span className="text-sm">{selectedPackage.transporter_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Disimpan oleh</span>
                <span className="text-sm">{selectedPackage.putaway_by_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Waktu simpan</span>
                <span className="text-xs text-stone-500">
                  {new Date(selectedPackage.putaway_at).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* 🔥 Tombol Ambil (Auto Sign) */}
          <button
            onClick={handlePickup}
            disabled={loading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-base tracking-wide shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all uppercase disabled:opacity-60"
          >
            {loading ? "⏳ Memproses..." : "📦 Ambil Paket"}
          </button>

          {/* Info Auto Sign */}
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <p className="text-[10px] text-stone-400 text-center">
              ⚡ Paket akan otomatis terambil dan tercatat di history
              <br />
              Tanpa perlu tanda tangan manual
            </p>
          </div>

          <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
            COOL SYSTEM V3 · PICKUP
          </footer>
        </div>
      </OperatorShell>
    );
  }

  return null;
}