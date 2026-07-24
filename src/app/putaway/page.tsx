"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import showToast, { withToast } from '@/lib/toast';
import { playAcceptedSound, playRejectedSound } from "@/lib/sound";
import OperatorShell from "@/components/mobile/OperatorShell";

export default function PutawayPage() {
  const router = useRouter();
  const inputBarcodeRef = useRef<HTMLInputElement>(null);
  const inputLocationRef = useRef<HTMLInputElement>(null); // 🔥 Tambah ref untuk lokasi rak
  const [loading, setLoading] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [sessionInfo, setSessionInfo] = useState<{ code: string; is_new: boolean } | null>(null);

  // Auto focus ke barcode saat halaman pertama terbuka
  useEffect(() => {
    setTimeout(() => inputBarcodeRef.current?.focus(), 200);
  }, []);

  // Handle proses simpan ke database
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

        // 🔥 Auto reset dan kembalikan fokus ke scan resi pertama
        setTimeout(() => {
          setBarcode("");
          setLocationCode("");
          setSessionInfo(null);
          setStatusMsg({ text: "", type: "" });
          inputBarcodeRef.current?.focus(); // 🔥 Siap terima paket berikutnya
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

  // 🔥 Logika penanganan tombol Enter pada input Resi / AWB
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (barcode.trim()) {
        // Jika resi sudah ada isinya, pindahkan laser langsung ke input lokasi rak
        inputLocationRef.current?.focus();
      } else {
        showToast.error("Scan barcode terlebih dahulu");
      }
    }
  };

  // 🔥 Logika penanganan tombol Enter pada input Lokasi Rak (Auto Save)
  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!loading) {
        handleScan(); // Langsung eksekusi simpan ke DB
      }
    }
  };

  const handleBack = () => {
    router.push("/menu");
  };

  return (
     <OperatorShell>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
              Putaway
            </p>
            <p className="font-extrabold text-lg text-stone-900">Simpan Paket</p>
          </div>
          <button
            onClick={handleBack}
            className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
          >
            ← Kembali
          </button>
        </div>

        {/* Session Info */}
        {sessionInfo && (
          <div className={`p-3 rounded-xl border-2 text-sm ${
            sessionInfo.is_new 
              ? "bg-blue-50 border-blue-200 text-blue-800" 
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}>
            {sessionInfo.is_new 
              ? `🆕 Session baru: ${sessionInfo.code}` 
              : `📋 Session: ${sessionInfo.code}`}
          </div>
        )}

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

        {/* Scanner Form */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
          <div>
            <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest">
              1. Scan Resi / AWB
            </label>
            <input
              ref={inputBarcodeRef}
              type="text"
              autoFocus
              disabled={loading}
              placeholder="Scan barcode..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcodeKeyDown} // 🔥 Pindah ke lokasi rak
              className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-mono text-lg font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest">
              2. Scan Lokasi Rak
            </label>
            <input
              ref={inputLocationRef} // 🔥 Menggunakan ref lokasi
              type="text"
              disabled={loading}
              placeholder="Contoh: A-01-03"
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
              onKeyDown={handleLocationKeyDown} // 🔥 Jalankan auto-save
              className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-mono text-lg font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50 uppercase"
            />
          </div>

          <button
            onClick={handleScan}
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-base tracking-wide shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all uppercase disabled:opacity-60"
          >
            {loading ? "⏳ Menyimpan..." : "📦 Simpan ke Lokasi"}
          </button>
        </div>

        {/* Info PWA */}

        <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
          nusaena v1 · PUTAWAY
        </footer>
      </div>
    </OperatorShell>
  );
}