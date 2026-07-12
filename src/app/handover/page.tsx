"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";
import { playAcceptedSound, playRejectedSound } from "@/lib/sound";
import OperatorShell from "@/components/mobile/OperatorShell";
import SignaturePadModal from "@/components/mobile/SignaturePad";

interface Session {
  id: string;
  session_code: string;
  transporter_name: string;
  operator_name: string;
  total_items: number;
  remaining_items: number;
  validated_items: number;
  status: string;
}

interface HandoverItem {
  id: string;
  barcode_resi: string;
  scanned_at: string;
  is_validated_handover: boolean;
  discrepancy_reason: string | null;
}

export default function HandoverPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionItems, setSessionItems] = useState<HandoverItem[]>([]);
  const [activeTab, setActiveTab] = useState<"ready" | "done">("ready");
  const [userRole, setUserRole] = useState<string>("");
  
  // Form state
  const [courierName, setCourierName] = useState("");
  const [securityName, setSecurityName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  
  // Signature state
  const [showCourierSignature, setShowCourierSignature] = useState(false);
  const [showSecuritySignature, setShowSecuritySignature] = useState(false);
  const [courierSignature, setCourierSignature] = useState("");
  const [securitySignature, setSecuritySignature] = useState("");
  
  // Mode & Flow
  const [step, setStep] = useState<"select" | "mode" | "trust" | "verify" | "complete">("select");
  const [mode, setMode] = useState<"trust" | "verify" | null>(null);
  const [verifyBarcode, setVerifyBarcode] = useState("");
  const [verifyProgress, setVerifyProgress] = useState({ scanned: 0, total: 0 });
  const [discrepancyReasons, setDiscrepancyReasons] = useState<Record<string, string>>({});

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/handover/sessions");
      if (res.ok) {
        const { sessions } = await res.json();
        const formatted = sessions.map((s: any) => ({
          id: s.id,
          session_code: s.session_code,
          transporter_name: s.transporter_name,
          operator_name: s.operator_name,
          total_items: Number(s.total_items) || 0,
          remaining_items: Number(s.remaining_items) || 0,
          validated_items: Number(s.validated_items) || 0,
          status: s.status,
          created_at: s.created_at,
        }));
        setAllSessions(formatted);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  }, []);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const { user } = await res.json();
          setUserRole(user?.role || "");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Filter sessions
  const readySessions = allSessions.filter(s => s.remaining_items > 0);
  const doneSessions = allSessions.filter(s => s.remaining_items === 0 && s.total_items > 0);

  // 🔥 Fungsi untuk close session manual - HANYA ADMIN
  const handleCloseSession = async (sessionId: string, sessionCode: string) => {
    if (userRole !== 'ADMIN') {
      showToast.error("Hanya Admin yang bisa menutup session tanpa manifest");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sorting/close-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast.success(`✅ Session ${sessionCode} telah ditutup tanpa manifest (Admin)`);
        await fetchSessions();
      } else {
        showToast.error(result.message || "Gagal menutup session");
      }
    } catch (error) {
      showToast.error("Error closing session");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Select session - Tab "Selesai" WAJIB melalui handover
  const handleSelectSession = async (session: Session) => {
    // 🔥 Jika di tab "Selesai", harus buat manifest dulu
    if (activeTab === "done") {
      if (session.remaining_items === 0 && session.total_items > 0) {
        const shouldProceed = confirm(
          `Session ${session.session_code} sudah selesai (${session.total_items} paket) ` +
          `tapi belum memiliki manifest handover.\n\n` +
          `Apakah Anda ingin membuat manifest sekarang?`
        );
        
        if (!shouldProceed) {
          return;
        }
        
        // Lanjut ke handover
        setLoading(true);
        setSelectedSession(session);
        
        try {
          const res = await fetch(`/api/handover/detail/${session.id}`);
          if (res.ok) {
            const data = await res.json();
            setSessionItems(data.items || []);
            
            const scanned = data.items.filter((i: HandoverItem) => i.is_validated_handover).length;
            setVerifyProgress({
              scanned: scanned,
              total: data.items.length
            });
            
            setStep("mode");
          } else {
            showToast.error("Gagal mengambil detail session");
          }
        } catch (error) {
          showToast.error("Error loading session detail");
        } finally {
          setLoading(false);
        }
        return;
      }
    }
    
    // Session normal (remaining > 0)
    if (session.remaining_items === 0) {
      showToast.warning("Session ini sudah selesai di-handover");
      return;
    }
    
    setLoading(true);
    setSelectedSession(session);
    
    try {
      const res = await fetch(`/api/handover/detail/${session.id}`);
      if (res.ok) {
        const data = await res.json();
        setSessionItems(data.items || []);
        
        const scanned = data.items.filter((i: HandoverItem) => i.is_validated_handover).length;
        setVerifyProgress({
          scanned: scanned,
          total: data.items.length
        });
        
        setStep("mode");
      } else {
        showToast.error("Gagal mengambil detail session");
      }
    } catch (error) {
      showToast.error("Error loading session detail");
    } finally {
      setLoading(false);
    }
  };

  // Pilih mode
  const handleSelectMode = (selectedMode: "trust" | "verify") => {
    setMode(selectedMode);
    if (selectedMode === "trust") {
      setStep("trust");
    } else {
      setStep("verify");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Handle verify scan
  const handleVerifyScan = async () => {
    const cleanBarcode = verifyBarcode.trim();
    if (!cleanBarcode) return;

    setLoading(true);
    try {
      const res = await fetch("/api/handover/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: selectedSession?.id,
          barcode: cleanBarcode,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        playAcceptedSound();
        showToast.success(`✅ ${cleanBarcode} diverifikasi`);
        
        setSessionItems(prev => 
          prev.map(item => 
            item.barcode_resi === cleanBarcode 
              ? { ...item, is_validated_handover: true }
              : item
          )
        );
        
        setVerifyProgress(prev => ({
          ...prev,
          scanned: prev.scanned + 1
        }));
        
        if (verifyProgress.scanned + 1 === verifyProgress.total) {
          showToast.success("🎉 Semua paket sudah discan!");
          setTimeout(() => setStep("trust"), 1500);
        }
      } else {
        playRejectedSound();
        showToast.error(result.message || "Barcode tidak valid");
      }
    } catch (error) {
      showToast.error("Error scanning barcode");
    } finally {
      setVerifyBarcode("");
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Handle Discrepancy
  const handleSetDiscrepancy = (barcode: string, reason: "NOT_FOUND" | "CANCELLED") => {
    setDiscrepancyReasons(prev => {
      const newReasons = { ...prev };
      if (newReasons[barcode] === reason) {
        delete newReasons[barcode];
        showToast.info(`✅ ${barcode} dibatalkan dari discrepancy`);
      } else {
        newReasons[barcode] = reason;
        showToast.info(`📝 ${barcode} → ${reason}`);
        setSessionItems(prev => 
          prev.map(item => 
            item.barcode_resi === barcode 
              ? { ...item, is_validated_handover: true, discrepancy_reason: reason }
              : item
          )
        );
        setVerifyProgress(prev => ({
          ...prev,
          scanned: prev.scanned + 1
        }));
      }
      return newReasons;
    });
  };

  // Handle Signature Save
  const handleCourierSignatureSave = (signature: string) => {
    setCourierSignature(signature);
    setShowCourierSignature(false);
    showToast.success("✅ Tanda tangan kurir tersimpan");
  };

  const handleSecuritySignatureSave = (signature: string) => {
    setSecuritySignature(signature);
    setShowSecuritySignature(false);
    showToast.success("✅ Tanda tangan security tersimpan");
  };

  // Finalize handover
  const handleFinalize = async () => {
    if (!selectedSession) return;
    
    if (!courierName.trim()) {
      showToast.error("Nama kurir wajib diisi");
      return;
    }
    if (!securityName.trim()) {
      showToast.error("Nama security wajib diisi");
      return;
    }
    if (!vehicleNumber.trim()) {
      showToast.error("Nomor kendaraan wajib diisi");
      return;
    }
    if (!courierSignature) {
      showToast.error("Tanda tangan kurir wajib diisi");
      setShowCourierSignature(true);
      return;
    }
    if (!securitySignature) {
      showToast.error("Tanda tangan security wajib diisi");
      setShowSecuritySignature(true);
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        session_id: selectedSession.id,
        mode: mode,
        courier_name: courierName,
        security_name: securityName,
        vehicle_number: vehicleNumber,
        courier_signature: courierSignature,
        security_signature: securitySignature,
      };

      if (mode === "verify" && Object.keys(discrepancyReasons).length > 0) {
        payload.discrepancy_reasons = discrepancyReasons;
      }

      const res = await fetch("/api/handover/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast.success(result.message);
        setStep("complete");
        await fetchSessions();
      } else {
        showToast.error(result.message || "Gagal finalisasi handover");
      }
    } catch (error) {
      showToast.error("Error finalizing handover");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "mode") {
      setStep("select");
      setSelectedSession(null);
    } else if (step === "trust" || step === "verify") {
      setStep("mode");
    }
  };

  const handleReset = () => {
    setStep("select");
    setSelectedSession(null);
    setMode(null);
    setCourierName("");
    setSecurityName("");
    setVehicleNumber("");
    setCourierSignature("");
    setSecuritySignature("");
    setDiscrepancyReasons({});
    setVerifyBarcode("");
  };

  // =============================================
  // RENDER: Select Session dengan TAB
  // =============================================
  if (step === "select") {
    const currentSessions = activeTab === "ready" ? readySessions : doneSessions;
    const totalReady = readySessions.length;
    const totalDone = doneSessions.length;

    return (
      <OperatorShell>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
                Handover
              </p>
              <p className="font-extrabold text-lg text-stone-900">Serah Terima Paket</p>
            </div>
            <button
              onClick={() => router.push("/menu")}
              className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
            >
              ← Menu
            </button>
          </div>

          {/* 🔥 TABS */}
          <div className="flex rounded-xl bg-stone-100 p-1">
            <button
              onClick={() => setActiveTab("ready")}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "ready"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Siap Handover ({totalReady})
            </button>
            <button
              onClick={() => setActiveTab("done")}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "done"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Buat Manifest ({totalDone})
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-stone-500 text-xs uppercase font-bold tracking-widest px-1">
              {activeTab === "ready" 
                ? "Pilih Sesi untuk Di-Handover" 
                : "Session Selesai - Buat Manifest Handover"}
            </p>
            
            {currentSessions.length === 0 ? (
              <div className="p-8 bg-white border-2 border-dashed border-stone-300 rounded-2xl text-center text-stone-500 text-sm">
                {activeTab === "ready" 
                  ? "✅ Semua sesi sudah selesai handover." 
                  : "✅ Semua session sudah memiliki manifest."}
              </div>
            ) : (
              currentSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s)}
                  className={`p-4 rounded-2xl border-l-4 border border-stone-200 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98] ${
                    activeTab === "ready" 
                      ? "border-l-orange-500" 
                      : "border-l-emerald-500"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-extrabold text-stone-900 font-mono">
                        {s.session_code}
                      </p>
                      <p className="text-stone-600 text-xs mt-1">
                        Kurir: <span className="font-semibold">{s.transporter_name}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-400">
                        {activeTab === "ready" ? "Siap handover" : "Selesai"}
                      </p>
                      <p className={`text-lg font-bold ${
                        activeTab === "ready" ? "text-orange-600" : "text-emerald-600"
                      }`}>
                        {activeTab === "ready" ? s.remaining_items : s.total_items}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-stone-400">
                    <span>Total: {s.total_items} paket</span>
                    <span className={s.validated_items > 0 ? "text-emerald-600" : "text-stone-400"}>
                      {s.validated_items || 0} sudah di-handover
                    </span>
                  </div>
                  
                  {/* 🔥 TOMBOL ACTION DI TAB "SELESAI" */}
                  {activeTab === "done" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSession(s);
                        }}
                        className="flex-1 text-[10px] bg-orange-500 hover:bg-orange-600 text-white py-1.5 rounded-lg font-medium transition-colors"
                      >
                        📝 Buat Manifest
                      </button>
                      {userRole === 'ADMIN' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(
                              `⚠️ PERINGATAN ADMIN!\n\n` +
                              `Session ${s.session_code} akan ditutup TANPA manifest.\n` +
                              `Data tidak akan tercatat di history logs.\n\n` +
                              `Yakin ingin melanjutkan?`
                            )) {
                              handleCloseSession(s.id, s.session_code);
                            }
                          }}
                          className="flex-1 text-[10px] bg-red-500 hover:bg-red-600 text-white py-1.5 rounded-lg font-medium transition-colors"
                        >
                          ❌ Tutup Tanpa Manifest
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
            COOL SYSTEM V3 · HANDOVER
          </footer>
        </div>
      </OperatorShell>
    );
  }

  // =============================================
  // RENDER: Mode Selection
  // =============================================
  if (step === "mode" && selectedSession) {
    return (
      <OperatorShell>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
                Handover
              </p>
              <p className="font-extrabold text-lg text-stone-900">Pilih Mode</p>
            </div>
            <button
              onClick={handleBack}
              className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
            >
              ← Kembali
            </button>
          </div>

          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
            <p className="font-bold text-orange-800">{selectedSession.session_code}</p>
            <p className="text-sm text-orange-700">
              {selectedSession.transporter_name} · {selectedSession.total_items} paket
            </p>
            <div className="mt-2 flex items-center gap-4">
              <span className="text-xs bg-white px-3 py-1 rounded-lg font-bold text-orange-600">
                📦 {selectedSession.remaining_items} siap handover
              </span>
              {selectedSession.remaining_items === 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-bold">
                  ✅ Selesai - Buat Manifest
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-stone-600 text-sm font-medium text-center">
              Apakah total paket sesuai dengan yang diterima kurir?
            </p>

            <button
              onClick={() => handleSelectMode("trust")}
              className="w-full p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-left hover:bg-emerald-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-xl">
                  ✅
                </div>
                <div>
                  <p className="font-bold text-emerald-800">YA, Total Sesuai</p>
                  <p className="text-xs text-emerald-600">Mode Trust · Langsung tanda tangan</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleSelectMode("verify")}
              className="w-full p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-left hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl">
                  🔍
                </div>
                <div>
                  <p className="font-bold text-amber-800">TIDAK, Ada Selisih</p>
                  <p className="text-xs text-amber-600">Mode Verify · Scan ulang paket</p>
                </div>
              </div>
            </button>
          </div>

          <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
            COOL SYSTEM V3 · HANDOVER
          </footer>
        </div>
      </OperatorShell>
    );
  }

  // =============================================
  // RENDER: Verify Mode
  // =============================================
  if (step === "verify" && selectedSession) {
    const allScanned = verifyProgress.scanned === verifyProgress.total;

    return (
      <OperatorShell>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
                Verify Mode
              </p>
              <p className="font-extrabold text-lg text-stone-900">Scan Ulang Paket</p>
            </div>
            <button
              onClick={handleBack}
              className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
            >
              ← Kembali
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="font-bold text-amber-800">{selectedSession.session_code}</p>
                <p className="text-xs text-amber-700">{selectedSession.transporter_name}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-600">
                  {verifyProgress.scanned}/{verifyProgress.total}
                </p>
                <p className="text-[10px] text-amber-500">terverifikasi</p>
              </div>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2.5">
              <div 
                className="bg-amber-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${verifyProgress.total > 0 ? (verifyProgress.scanned / verifyProgress.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200">
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyScan(); }} className="space-y-3">
              <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest">
                {allScanned ? "✅ Semua paket sudah discan" : "Scan Barcode Paket"}
              </label>
              <input
                ref={inputRef}
                type="text"
                autoFocus
                disabled={loading || allScanned}
                placeholder={allScanned ? "Semua sudah discan" : "Scan resi..."}
                value={verifyBarcode}
                onChange={(e) => setVerifyBarcode(e.target.value)}
                className={`w-full px-4 py-3 bg-stone-50 border-2 rounded-xl text-stone-900 font-mono text-lg font-semibold focus:outline-none focus:border-amber-500 ${
                  allScanned ? "border-emerald-300 bg-emerald-50" : "border-stone-300"
                }`}
              />
              <button
                type="submit"
                disabled={loading || allScanned}
                className={`w-full py-3 font-bold rounded-xl transition-all ${
                  allScanned
                    ? "bg-emerald-500 text-white cursor-not-allowed"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                }`}
              >
                {loading ? "⏳ Memproses..." : allScanned ? "✅ Selesai" : "🔍 Verifikasi Paket"}
              </button>
            </form>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1.5">
            <p className="text-xs text-stone-400 font-medium px-1">
              {sessionItems.filter(i => !i.is_validated_handover).length} paket belum diverifikasi
            </p>
            {sessionItems.map((item) => {
              const isDiscrepancy = discrepancyReasons[item.barcode_resi] !== undefined;
              
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-sm border ${
                    item.is_validated_handover
                      ? isDiscrepancy
                        ? "bg-red-50 border-red-200"
                        : "bg-emerald-50 border-emerald-200"
                      : "bg-white border-stone-200"
                  }`}
                >
                  <span className="font-mono text-stone-800">{item.barcode_resi}</span>
                  
                  <div className="flex items-center gap-2">
                    {item.is_validated_handover ? (
                      <span className="text-xs font-medium text-emerald-600">
                        {isDiscrepancy ? `⚠️ ${discrepancyReasons[item.barcode_resi]}` : "✅ DONE"}
                      </span>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleSetDiscrepancy(item.barcode_resi, "NOT_FOUND")}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors active:scale-95"
                        >
                          ❌ Not Found
                        </button>
                        <button
                          onClick={() => handleSetDiscrepancy(item.barcode_resi, "CANCELLED")}
                          className="px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs font-bold rounded-lg transition-colors active:scale-95"
                        >
                          ⛔ Cancelled
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setStep("trust")}
            disabled={
              !allScanned && 
              Object.keys(discrepancyReasons).length === 0
            }
            className={`w-full py-3.5 font-bold rounded-xl transition-all text-sm ${
              allScanned || Object.keys(discrepancyReasons).length > 0
                ? "bg-stone-900 hover:bg-stone-800 text-white"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
            }`}
          >
            {allScanned 
              ? "📝 Lanjut ke Tanda Tangan (Semua Selesai)" 
              : Object.keys(discrepancyReasons).length > 0 
                ? `📝 Lanjut ke Tanda Tangan (${Object.keys(discrepancyReasons).length} discrepancy)` 
                : "⏳ Scan semua paket atau tandai discrepancy"}
          </button>

          {Object.keys(discrepancyReasons).length > 0 && (
            <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl">
              <p className="text-xs text-red-600 font-medium">
                ⚠️ {Object.keys(discrepancyReasons).length} paket bermasalah:
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(discrepancyReasons).map(([barcode, reason]) => (
                  <span key={barcode} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono">
                    {barcode} ({reason})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </OperatorShell>
    );
  }

  // =============================================
  // RENDER: Trust Mode (Tanda Tangan)
  // =============================================
  if (step === "trust" && selectedSession) {
    const isVerify = mode === "verify";

    return (
      <>
        <OperatorShell>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
                  {isVerify ? "Verify Mode" : "Trust Mode"}
                </p>
                <p className="font-extrabold text-lg text-stone-900">Tanda Tangan</p>
              </div>
              <button
                onClick={handleBack}
                className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
              >
                ← Kembali
              </button>
            </div>

            <div className={`p-3 rounded-xl border ${
              isVerify ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
            }`}>
              <p className="font-bold">{selectedSession.session_code}</p>
              <p className="text-xs text-stone-600">
                {selectedSession.transporter_name} · {selectedSession.total_items} paket
              </p>
              {isVerify && Object.keys(discrepancyReasons).length > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ {Object.keys(discrepancyReasons).length} paket bermasalah
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Nama Kurir *
                </label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="Masukkan nama kurir"
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Nama Security *
                </label>
                <input
                  type="text"
                  value={securityName}
                  onChange={(e) => setSecurityName(e.target.value)}
                  placeholder="Masukkan nama security"
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Nomor Kendaraan *
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="Contoh: B 1234 ABC"
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Tanda Tangan Kurir *
                  </label>
                  <button
                    onClick={() => setShowCourierSignature(true)}
                    className={`w-full py-3 rounded-xl border-2 font-medium transition-all ${
                      courierSignature
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-dashed border-stone-300 bg-stone-50 text-stone-500 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                  >
                    {courierSignature ? "✅ Tersimpan" : "✍️ Tanda Tangan"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Tanda Tangan Security *
                  </label>
                  <button
                    onClick={() => setShowSecuritySignature(true)}
                    className={`w-full py-3 rounded-xl border-2 font-medium transition-all ${
                      securitySignature
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-dashed border-stone-300 bg-stone-50 text-stone-500 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                  >
                    {securitySignature ? "✅ Tersimpan" : "✍️ Tanda Tangan"}
                  </button>
                </div>
              </div>

              {courierSignature && securitySignature && (
                <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-center">
                  <p className="text-xs text-emerald-700">✅ Kedua tanda tangan sudah tersimpan</p>
                </div>
              )}
            </div>

            <button
              onClick={handleFinalize}
              disabled={loading || !courierSignature || !securitySignature}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl text-base tracking-wide shadow-lg shadow-orange-600/25 active:scale-[0.98] transition-all uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "⏳ Memproses..." : "✅ Selesaikan Handover"}
            </button>
          </div>
        </OperatorShell>

        {showCourierSignature && (
          <SignaturePadModal
            title="Tanda Tangan Kurir"
            subtitle="Silakan tanda tangan di area di bawah ini"
            onSave={handleCourierSignatureSave}
            onClose={() => setShowCourierSignature(false)}
            saveText="Simpan Tanda Tangan"
          />
        )}

        {showSecuritySignature && (
          <SignaturePadModal
            title="Tanda Tangan Security"
            subtitle="Silakan tanda tangan di area di bawah ini"
            onSave={handleSecuritySignatureSave}
            onClose={() => setShowSecuritySignature(false)}
            saveText="Simpan Tanda Tangan"
          />
        )}
      </>
    );
  }

  // =============================================
  // RENDER: Complete
  // =============================================
  if (step === "complete") {
    return (
      <OperatorShell>
        <div className="p-4 space-y-4">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-emerald-600">Handover Berhasil!</h2>
            <p className="text-stone-500 mt-2">
              {mode === "trust" 
                ? "Semua paket DONE, tidak ada discrepancy" 
                : `Handover selesai dengan ${Object.keys(discrepancyReasons).length} discrepancy`}
            </p>
            <button
              onClick={handleReset}
              className="mt-6 px-6 py-3 bg-orange-600 text-white font-bold rounded-xl"
            >
              Kembali ke Daftar
            </button>
          </div>
        </div>
      </OperatorShell>
    );
  }

  return null;
}