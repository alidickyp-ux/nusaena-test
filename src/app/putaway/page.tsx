"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Scan,
  MapPin,
  Package,
  CheckCircle2,
  AlertCircle,
  Boxes,
} from "lucide-react";
import showToast from '@/lib/toast';
import { playAcceptedSound, playRejectedSound } from "@/lib/sound";
import OperatorShell from "@/components/mobile/OperatorShell";

export default function PutawayPage() {
  const router = useRouter();
  const inputBarcodeRef = useRef<HTMLInputElement>(null);
  const inputLocationRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [sessionInfo, setSessionInfo] = useState<{ code: string; is_new: boolean } | null>(null);

  useEffect(() => {
    setTimeout(() => inputBarcodeRef.current?.focus(), 200);
  }, []);

  const handleScan = async () => {
    const cleanBarcode = barcode.trim();
    const cleanLocation = locationCode.trim();

    if (!cleanBarcode) {
      showToast.error("Scan barcode terlebih dahulu");
      setStatusMsg({ text: "⚠️ Scan barcode paket", type: "error" });
      inputBarcodeRef.current?.focus();
      return;
    }

    if (!cleanLocation) {
      showToast.error("Scan lokasi terlebih dahulu");
      setStatusMsg({ text: "⚠️ Scan lokasi rak", type: "error" });
      inputLocationRef.current?.focus();
      return;
    }

    setLoading(true);
    setStatusMsg({ text: "⏳ Menyimpan paket...", type: "info" });

    try {
      const res = await fetch("/api/putaway/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: cleanBarcode,
          location_code: cleanLocation,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        playAcceptedSound();
        showToast.success(result.message);

        setSessionInfo({
          code: result.data.session_code,
          is_new: result.data.is_new_session || false,
        });

        setStatusMsg({
          text: `✅ ${result.message}`,
          type: "success"
        });

        setTimeout(() => {
          setBarcode("");
          setLocationCode("");
          setSessionInfo(null);
          setStatusMsg({ text: "", type: "" });
          inputBarcodeRef.current?.focus();
        }, 800);
      } else {
        playRejectedSound();
        showToast.error(result.message || "Gagal menyimpan paket");
        setStatusMsg({
          text: `❌ ${result.message || "Gagal"}`,
          type: "error"
        });
        inputBarcodeRef.current?.focus();
      }
    } catch (error) {
      playRejectedSound();
      showToast.error("Error connecting to server");
      setStatusMsg({ text: "❌ Error server", type: "error" });
      inputBarcodeRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (barcode.trim()) {
        inputLocationRef.current?.focus();
      } else {
        showToast.error("Scan barcode terlebih dahulu");
      }
    }
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!loading) {
        handleScan();
      }
    }
  };

  const handleBack = () => {
    router.push("/menu");
  };

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
                Putaway
              </p>
              <p className="font-extrabold text-lg text-slate-900 leading-tight">
                Simpan Paket
              </p>
            </div>
          </div>

          {/* Session Info */}
          {sessionInfo && (
            <div className={`p-3 rounded-2xl border-2 text-sm font-bold flex items-center gap-2 ${
              sessionInfo.is_new
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}>
              {sessionInfo.is_new ? (
                <>
                  <Boxes className="w-4 h-4 flex-shrink-0" />
                  Session baru: <span className="font-mono">{sessionInfo.code}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Session: <span className="font-mono">{sessionInfo.code}</span>
                </>
              )}
            </div>
          )}

          {/* Status Message */}
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

          {/* Scanner Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">

            {/* Step 1: Barcode */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-blue-600">1</span>
                </div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Scan className="w-3.5 h-3.5" />
                  Scan Resi / AWB
                </label>
              </div>
              <input
                ref={inputBarcodeRef}
                type="text"
                autoFocus
                disabled={loading}
                placeholder="Scan barcode..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-mono text-lg font-bold focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all disabled:opacity-50 text-center"
              />
            </div>

            {/* Step 2: Location */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-blue-600">2</span>
                </div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Scan Lokasi Rak
                </label>
              </div>
              <input
                ref={inputLocationRef}
                type="text"
                disabled={loading}
                placeholder="Contoh: A-01-03"
                value={locationCode}
                onChange={(e) => setLocationCode(e.target.value)}
                onKeyDown={handleLocationKeyDown}
                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-mono text-lg font-bold focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all disabled:opacity-50 uppercase text-center"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleScan}
              disabled={loading}
              className="w-full py-4 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white font-extrabold rounded-xl text-base tracking-wide shadow-lg shadow-[#0B2B4A]/20 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  Simpan ke Lokasi
                </>
              )}
            </button>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Scan className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-800 mb-1">Alur Scan</p>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  1. Scan barcode paket → otomatis pindah ke input lokasi
                  <br />
                  2. Scan kode lokasi rak → auto-save
                </p>
              </div>
            </div>
          </div>

          <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
            nusaena v1 · PUTAWAY
          </footer>
        </div>
      </div>
    </OperatorShell>
  );
}