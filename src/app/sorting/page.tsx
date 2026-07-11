"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import OperatorShell from "@/components/mobile/OperatorShell";
import { playAcceptedSound, playRejectedSound } from "@/lib/sound";

interface ActiveSession {
  id: string;
  session_code: string;
  transporter_name: string;
  operator_name: string;
  total_items: number;
  remaining_items: number;
}

interface Master3PL {
  id: number;
  transporter_name: string;
  transporter_code: string;
  is_active: boolean;
  notes: string;
}

export default function SortingPage() {
  const router = useRouter();
  const [operatorId, setOperatorId] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [master3PL, setMaster3PL] = useState<Master3PL[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [isInitialized, setIsInitialized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // State Kontrol Kunci Sesi Manual
  const [selectedManualSession, setSelectedManualSession] = useState<ActiveSession | null>(null);
  const [selectedTransporterId, setSelectedTransporterId] = useState("");

  // 1. Ambil Sesi Running - PAKAI API SORTING KHUSUS
        const fetchLiveSessions = useCallback(async () => {
          try {
            // 🔥 Gunakan API sorting, BUKAN handover
            const res = await fetch("/api/sorting/sessions");
            if (res.ok) {
              const { sessions } = await res.json();
              const formatted = sessions.map((s: any) => ({
                id: s.id,
                session_code: s.session_code,
                transporter_name: s.transporter_name,
                operator_name: s.operator_name,
                total_items: Number(s.total_items || 0),
                remaining_items: Number(s.remaining_items || 0),
              }));
              setActiveSessions(formatted);
            }
          } catch (err) {
            console.error("Gagal memuat sesi running:", err);
          }
        }, []);// ✅ TANPA dependency

  // 2. Ambil Master 3PL
  const fetchMaster3PL = useCallback(async () => {
    try {
      const res = await fetch("/api/3pl");
      if (res.ok) {
        const data = await res.json();
        setMaster3PL(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat master 3PL:", err);
    }
  }, []); // ✅ TANPA dependency

  // 3. INIT - Hanya dijalankan sekali
  useEffect(() => {
    const init = async () => {
      try {
        const authRes = await fetch("/api/auth/me");
        if (!authRes.ok) {
          router.push("/");
          return;
        }
        const { user } = await authRes.json();
        
        setOperatorId(user.id);
        setOperatorName(user.full_name);
        
        await Promise.all([
          fetchLiveSessions(),
          fetchMaster3PL()
        ]);
        
        setIsInitialized(true);
        setTimeout(() => inputRef.current?.focus(), 200);
      } catch (error) {
        console.error("Init error:", error);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ HANYA dijalankan sekali

  // 4. Update selectedManualSession ketika activeSessions berubah
  useEffect(() => {
    if (selectedManualSession && activeSessions.length > 0) {
      const current = activeSessions.find(s => s.id === selectedManualSession.id);
      if (current) {
        setSelectedManualSession(current);
      } else {
        // Jika session sudah tidak ada, lepas lock
        setSelectedManualSession(null);
      }
    }
  }, [activeSessions, selectedManualSession]);

  // 5. Trigger Pembuatan Sesi Manual
  const handleCreateManualSession = async () => {
    if (!selectedTransporterId) {
      setStatusMsg({ 
        text: "⚠️ Pilih ekspedisi terlebih dahulu!", 
        type: "error" 
      });
      return;
    }

    setLoading(true);
    setStatusMsg({ text: "⏳ Membuat sesi manual...", type: "info" });
    
    try {
      const res = await fetch("/api/sorting/manual-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          transporter_id: Number(selectedTransporterId),
          operator_id: operatorId 
        }),
      });

      const result = await res.json();
      
      if (res.ok && result.success) {
        setStatusMsg({ 
          text: `✅ Sesi manual ${result.session_code} dibuka!`, 
          type: "success" 
        });
        await fetchLiveSessions();
        setSelectedTransporterId("");
      } else {
        setStatusMsg({ 
          text: `❌ ${result.message || "Gagal membuka sesi manual"}`, 
          type: "error" 
        });
      }
    } catch (err) {
      setStatusMsg({ 
        text: "❌ Error koneksi server", 
        type: "error" 
      });
      console.error("Error creating manual session:", err);
    } finally {
      setLoading(false);
    }
  };

  // 6. Eksekusi Scan
  const handleScan = async () => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    setLoading(true);
    setStatusMsg({ text: "", type: "" });

    try {
      if (navigator.vibrate) navigator.vibrate(40);

      const res = await fetch("/api/sorting/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: cleanBarcode,
          operator_id: operatorId,
          manual_session_id: selectedManualSession ? selectedManualSession.id : null
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        if (navigator.vibrate) navigator.vibrate([60, 60]);
        playRejectedSound();
        setStatusMsg({ text: result.message || "Gagal memproses resi", type: "error" });
      } else {
        playAcceptedSound();
        setStatusMsg({ text: result.message, type: "success" });
        await fetchLiveSessions();
      }
    } catch (err) {
      playRejectedSound();
      setStatusMsg({ text: "Sistem error server, coba lagi.", type: "error" });
      console.error("Scan error:", err);
    } finally {
      setBarcode("");
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  };

  // 7. Lepas Lock Manual Session
  const handleUnlockSession = () => {
    setSelectedManualSession(null);
    setStatusMsg({ text: "🔓 Lock manual dilepas", type: "info" });
    setTimeout(() => {
      setStatusMsg({ text: "", type: "" });
    }, 2000);
  };

  // Loading state
  if (!isInitialized) {
    return (
      <OperatorShell>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-stone-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
              <p className="text-stone-500 text-sm mt-4">Loading...</p>
            </div>
          </div>
        </div>
      </OperatorShell>
    );
  }

  return (
    <OperatorShell>
      <div className="p-4 space-y-4 font-sans text-[0.75rem] text-stone-700">
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-1">
          <div>
            <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">Ops</p>
            <p className="font-extrabold text-lg text-stone-900 leading-tight">{operatorName}</p>
          </div>
          <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wide">
            Sorting
          </span>
        </div>

        {/* CONTROLLER MANUAL BATCH */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <p className="text-stone-500 font-bold uppercase text-[0.63rem] tracking-wider">
            🛠️ Buka Sesi Manual (Resi DO / Cacat Prefix)
          </p>
          <div className="flex space-x-2">
            <select
              value={selectedTransporterId}
              onChange={(e) => setSelectedTransporterId(e.target.value)}
              className="flex-1 p-2 bg-white border-2 border-stone-200 rounded-xl text-stone-900 font-mono text-[0.75rem] focus:outline-none focus:border-orange-500"
            >
              <option value="">-- PILIH 3PL --</option>
              {master3PL.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.transporter_name}
                </option>
              ))}
            </select>
            <button 
              onClick={handleCreateManualSession}
              disabled={loading || !selectedTransporterId}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Sesi
            </button>
          </div>
          {selectedTransporterId && (
            <p className="text-[10px] text-stone-400">
              Membuka sesi untuk: {master3PL.find(t => t.id === Number(selectedTransporterId))?.transporter_name}
            </p>
          )}
        </div>

        {/* STATUS DISPLAY */}
        {statusMsg.text && (
          <div className={`p-4 rounded-2xl border-2 font-bold text-sm ${
            statusMsg.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-300" : 
            statusMsg.type === "error" ? "bg-rose-50 text-rose-800 border-rose-300" :
            "bg-blue-50 text-blue-800 border-blue-300"
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* INDIKATOR MANUAL MODE */}
        {selectedManualSession && (
          <div className="bg-amber-50 border-2 border-amber-300 p-3 rounded-2xl flex justify-between items-center">
            <div>
              <p className="text-amber-700 text-[0.6rem] uppercase tracking-wider font-bold">🔒 MODE MANUAL AKTIF</p>
              <p className="text-stone-900 text-[0.8rem] font-mono font-bold">
                {selectedManualSession.session_code} 
                <span className="text-stone-400 text-[0.65rem] ml-2">
                  ({selectedManualSession.total_items} Pcs)
                </span>
              </p>
            </div>
            <button 
              onClick={handleUnlockSession}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[0.65rem] transition-colors"
            >
              Lepas
            </button>
          </div>
        )}

        {/* SCANNER CONSOLE */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <form onSubmit={(e) => { e.preventDefault(); handleScan(); }} className="space-y-3">
            <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest">
              {selectedManualSession ? "📌 Scan akan masuk ke sesi manual!" : "Arahkan laser / tembak barcode paket"}
            </label>
            <input
              ref={inputRef}
              type="text"
              autoFocus
              disabled={loading}
              placeholder="Scan resi (JX..., SPXID...)"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full px-4 py-4 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-mono text-lg font-semibold focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 placeholder:text-stone-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl text-base tracking-wide shadow-lg shadow-orange-600/25 active:scale-[0.98] transition-all uppercase disabled:opacity-60"
            >
              {loading ? "⏳ Menyimpan..." : "📦 Proses Scan"}
            </button>
          </form>
        </div>

        {/* RUNNING SESSIONS */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <p className="text-stone-500 text-xs uppercase font-bold tracking-widest">
              📋 Sesi Running ({activeSessions.length})
            </p>
            {selectedManualSession && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                🔒 Locked
              </span>
            )}
          </div>
          {activeSessions.length === 0 ? (
            <div className="p-8 bg-white border-2 border-dashed border-stone-300 rounded-2xl text-center text-stone-500 text-sm">
              Belum ada sesi aktif.<br/>
              Scan resi otomatis atau buka sesi manual.
            </div>
          ) : (
            <div className="space-y-2">
              {activeSessions.map((s) => (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedManualSession(s)}
                  className={`p-4 rounded-2xl border-l-4 transition-all cursor-pointer shadow-sm ${
                    selectedManualSession?.id === s.id 
                      ? "bg-amber-50/70 border-amber-400 border-l-amber-600" 
                      : "bg-white border-stone-200 border-l-orange-500 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedManualSession?.id === s.id ? "bg-amber-600 animate-pulse" : "bg-emerald-500"}`}></span>
                    <span className="text-base font-extrabold text-stone-900 font-mono truncate">
                      {s.session_code}
                    </span>
                  </div>
                  <p className="text-stone-600 text-xs mt-1 font-medium">
                    Kurir: <span className="text-stone-900 font-bold">{s.transporter_name}</span>
                    {" · "}
                    <span className="text-orange-700 font-bold font-mono">{s.total_items} Pcs</span>
                  </p>
                  <p className="text-stone-400 text-[11px] mt-0.5">
                    Dibuka oleh: <span className="text-stone-600 font-semibold">{s.operator_name}</span>
                    {" · "}
                    <span className={s.remaining_items === 0 ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                      {s.remaining_items} belum di-handover
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
          COOL SYSTEM V3 · HYBRID ROUTING ENGINE
        </footer>
      </div>
    </OperatorShell>
  );
}