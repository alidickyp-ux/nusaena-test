"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Scan,
  Package,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Plus,
  Building2,
  ListChecks,
  Boxes,
} from "lucide-react";
import OperatorShell from "@/components/mobile/OperatorShell";
import { playAcceptedSound, playRejectedSound } from "@/lib/sound";
import showToast from '@/lib/toast';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [operatorId, setOperatorId] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [master3PL, setMaster3PL] = useState<Master3PL[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);

  const [selectedManualSession, setSelectedManualSession] = useState<ActiveSession | null>(null);
  const [selectedTransporterId, setSelectedTransporterId] = useState("");

  const fetchLiveSessions = useCallback(async () => {
    try {
      console.log("🔄 Fetching sessions...");
      const res = await fetch(`/api/sorting/sessions?_=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (res.ok) {
        const { sessions } = await res.json();
        console.log("📦 Sessions received:", sessions);

        const formatted = sessions.map((s: any) => ({
          id: s.id,
          session_code: s.session_code,
          transporter_name: s.transporter_name,
          operator_name: s.operator_name,
          total_items: Number(s.total_items || 0),
          remaining_items: Number(s.remaining_items || 0),
        }));

        setActiveSessions(formatted);
        return formatted;
      }
    } catch (err) {
      console.error("Gagal memuat sesi running:", err);
    }
    return [];
  }, []);

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
  }, []);

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
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      fetchLiveSessions();
    }, 2000);

    return () => clearInterval(interval);
  }, [isInitialized, fetchLiveSessions]);

  useEffect(() => {
    if (!isInitialized) return;

    const handleFocus = () => {
      console.log("📱 Window focused, refreshing...");
      fetchLiveSessions();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        console.log("📱 Tab visible, refreshing...");
        fetchLiveSessions();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isInitialized, fetchLiveSessions]);

  useEffect(() => {
    if (selectedManualSession && activeSessions.length > 0) {
      const current = activeSessions.find(s => s.id === selectedManualSession.id);
      if (current) {
        setSelectedManualSession(current);
      } else {
        setSelectedManualSession(null);
      }
    }
  }, [activeSessions, selectedManualSession]);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    showToast.info("🔄 Memperbarui data...");
    await fetchLiveSessions();
    setIsRefreshing(false);
    showToast.success("✅ Data diperbarui");
  };

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
        setTimeout(async () => {
          await fetchLiveSessions();
        }, 500);
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
        setTimeout(async () => {
          await fetchLiveSessions();
        }, 300);
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

  const handleUnlockSession = () => {
    setSelectedManualSession(null);
    setStatusMsg({ text: "🔓 Lock manual dilepas", type: "info" });
    setTimeout(() => {
      setStatusMsg({ text: "", type: "" });
    }, 2000);
  };

  const handleBack = () => {
    router.push("/menu");
  };

  if (!isInitialized) {
    return (
      <OperatorShell>
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-md mx-auto p-4 flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0B2B4A] rounded-full animate-spin"></div>
              <p className="text-slate-400 text-xs font-medium">Loading...</p>
            </div>
          </div>
        </div>
      </OperatorShell>
    );
  }

  return (
    <OperatorShell>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-md mx-auto p-4 space-y-4">

          {/* HEADER */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-white rounded-xl transition-colors border border-slate-200 bg-white"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex-1">
              <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-widest">
                Ops · Sorting
              </p>
              <p className="font-extrabold text-lg text-slate-900 leading-tight truncate">
                {operatorName}
              </p>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors ${
                isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Live Indicator */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-extrabold text-slate-900 leading-none">
                  {activeSessions.length}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                  Sesi Aktif
                </p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#0B2B4A] leading-none">
                  {activeSessions.reduce((acc, s) => acc + s.total_items, 0)}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                  Total Paket
                </p>
              </div>
            </div>
          </div>

          {/* MANUAL SESSION CREATOR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              Buka Sesi Manual
            </div>
            <p className="text-[10px] text-slate-400 -mt-1">
              Aktifkan sesi manual hanya untuk LEX dan Biteship
            </p>
            <div className="flex gap-2">
              <select
                value={selectedTransporterId}
                onChange={(e) => setSelectedTransporterId(e.target.value)}
                className="flex-1 px-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all"
              >
                <option value="">-- Pilih 3PL --</option>
                {master3PL.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.transporter_name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateManualSession}
                disabled={loading || !selectedTransporterId}
                className="px-4 py-3 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg shadow-[#0B2B4A]/20"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs">Sesi</span>
              </button>
            </div>
            {selectedTransporterId && (
              <p className="text-[10px] text-slate-400">
                Membuka sesi untuk: <span className="font-semibold text-slate-600">{master3PL.find(t => t.id === Number(selectedTransporterId))?.transporter_name}</span>
              </p>
            )}
          </div>

          {/* STATUS MESSAGE */}
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

          {/* MANUAL MODE INDICATOR */}
          {selectedManualSession && (
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 shadow-lg">
              <div className="flex justify-between items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-4 h-4 text-white" />
                    <p className="text-[10px] text-white/80 uppercase tracking-wider font-bold">
                      Mode Manual Aktif
                    </p>
                  </div>
                  <p className="text-white font-mono font-extrabold text-sm truncate">
                    {selectedManualSession.session_code}
                  </p>
                  <p className="text-white/80 text-[11px] mt-0.5">
                    {selectedManualSession.total_items} Pcs
                  </p>
                </div>
                <button
                  onClick={handleUnlockSession}
                  className="px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 flex-shrink-0 ml-3"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Lepas
                </button>
              </div>
            </div>
          )}

          {/* SCANNER CONSOLE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <form onSubmit={(e) => { e.preventDefault(); handleScan(); }} className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Scan className="w-4 h-4" />
                {selectedManualSession ? "Scan Masuk Sesi Manual" : "Scan Barcode Paket"}
              </div>
              <input
                ref={inputRef}
                type="text"
                autoFocus
                disabled={loading}
                placeholder="Scan resi (JX..., SPXID...)"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-xl text-slate-900 font-mono text-lg font-bold focus:outline-none focus:bg-white transition-all disabled:opacity-50 text-center ${
                  selectedManualSession
                    ? "border-amber-300 focus:border-amber-500"
                    : "border-slate-200 focus:border-[#0B2B4A]"
                }`}
              />
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 font-extrabold rounded-xl text-base tracking-wide shadow-lg active:scale-[0.98] transition-all uppercase disabled:opacity-60 flex items-center justify-center gap-2 ${
                  selectedManualSession
                    ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25"
                    : "bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white shadow-[#0B2B4A]/20"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Package className="w-5 h-5" />
                    Proses Scan
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RUNNING SESSIONS */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-slate-400" />
                <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">
                  Sesi Running ({activeSessions.length})
                </p>
              </div>
              {selectedManualSession && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Locked
                </span>
              )}
            </div>

            {activeSessions.length === 0 ? (
              <div className="p-8 bg-white border-2 border-dashed border-slate-300 rounded-2xl text-center">
                <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-medium">Belum ada sesi aktif</p>
                <p className="text-slate-400 text-xs mt-1">Scan resi otomatis atau buka sesi manual</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeSessions.map((s) => {
                  const isSelected = selectedManualSession?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedManualSession(s)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm active:scale-[0.98] ${
                        isSelected
                          ? "bg-amber-50 border-amber-300 border-l-4 border-l-amber-500"
                          : "bg-white border-slate-200 border-l-4 border-l-[#0B2B4A] hover:bg-slate-50 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isSelected ? "bg-amber-600 animate-pulse" : "bg-emerald-500"
                        }`}></span>
                        <span className="text-sm font-extrabold text-slate-900 font-mono truncate">
                          {s.session_code}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 flex-shrink-0">
                            <Lock className="w-3 h-3" />
                            AKTIF
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs font-medium mb-1">
                        Kurir: <span className="text-slate-900 font-bold">{s.transporter_name}</span>
                        {" · "}
                        <span className="text-[#0B2B4A] font-bold font-mono">{s.total_items} Pcs</span>
                      </p>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          Oleh: <span className="text-slate-600 font-semibold">{s.operator_name}</span>
                        </span>
                        <span className={`font-bold ${
                          s.remaining_items === 0 ? "text-emerald-600" : "text-amber-600"
                        }`}>
                          {s.remaining_items === 0
                            ? "✅ Selesai"
                            : `${s.remaining_items} pending`
                          }
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
            nusaena v1 · SORTING
          </footer>
        </div>
      </div>
    </OperatorShell>
  );
}