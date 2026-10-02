"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Package,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Scan,
  Search,
  Camera,
  PenTool,
  Lock,
  FileText,
  User,
  Truck,
} from "lucide-react";
import showToast from '@/lib/toast';
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
  validated_by: string | null;
  validated_at: string | null;
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

  const [courierName, setCourierName] = useState("");
  const [securityName, setSecurityName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  const [showCourierSignature, setShowCourierSignature] = useState(false);
  const [showSecuritySignature, setShowSecuritySignature] = useState(false);
  const [courierSignature, setCourierSignature] = useState("");
  const [securitySignature, setSecuritySignature] = useState("");

  const [courierPhotoUrl, setCourierPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [step, setStep] = useState<"select" | "mode" | "trust" | "verify" | "complete">("select");
  const [mode, setMode] = useState<"trust" | "verify" | null>(null);
  const [verifyBarcode, setVerifyBarcode] = useState("");
  const [verifyProgress, setVerifyProgress] = useState({ scanned: 0, total: 0 });
  const [discrepancyReasons, setDiscrepancyReasons] = useState<Record<string, string>>({});

  const [verifyMethod, setVerifyMethod] = useState<"scan" | "search">("scan");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HandoverItem[]>([]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/handover/sessions", { cache: "no-store" });
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

  useEffect(() => {
    const handleFocus = () => fetchSessions();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchSessions();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchSessions]);

  const readySessions = allSessions.filter(s => s.remaining_items > 0);
  const doneSessions = allSessions.filter(s => s.remaining_items === 0 && s.total_items > 0);

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

  const handleSelectSession = async (session: Session) => {
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

        setLoading(true);
        setSelectedSession(session);

        try {
          const res = await fetch(`/api/handover/detail/${session.id}`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            setSessionItems(data.items || []);

            const reasons: Record<string, string> = {};
            data.items.forEach((item: HandoverItem) => {
              if (item.discrepancy_reason) reasons[item.barcode_resi] = item.discrepancy_reason;
            });
            setDiscrepancyReasons(reasons);

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

    if (session.remaining_items === 0) {
      showToast.warning("Session ini sudah selesai di-handover");
      return;
    }

    setLoading(true);
    setSelectedSession(session);

    try {
      const res = await fetch(`/api/handover/detail/${session.id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSessionItems(data.items || []);

        const reasons: Record<string, string> = {};
        data.items.forEach((item: HandoverItem) => {
          if (item.discrepancy_reason) reasons[item.barcode_resi] = item.discrepancy_reason;
        });
        setDiscrepancyReasons(reasons);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast.error("Ukuran foto maksimal 10MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setCourierPhotoUrl(data.secure_url);
        showToast.success("✅ Foto berhasil diupload");
      } else {
        showToast.error(data.error || "Upload gagal");
      }
    } catch (error) {
      showToast.error("Error upload foto");
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSelectMode = (selectedMode: "trust" | "verify") => {
    setMode(selectedMode);
    if (selectedMode === "trust") {
      setStep("trust");
    } else {
      setStep("verify");
      setVerifyMethod("scan");
      setSearchQuery("");
      setSearchResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

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

        setSessionItems(prev => {
          const updated = prev.map(item =>
            item.barcode_resi === cleanBarcode
              ? { ...item, is_validated_handover: true }
              : item
          );
          const newScanned = updated.filter(i => i.is_validated_handover).length;
          setVerifyProgress({
            scanned: newScanned,
            total: updated.length
          });
          return updated;
        });

        setTimeout(() => {
          const currentScanned = sessionItems.filter(i => i.is_validated_handover).length + 1;
          if (currentScanned === sessionItems.length) {
            showToast.success("🎉 Semua paket sudah discan!");
            setTimeout(() => setStep("trust"), 1500);
          }
        }, 300);

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

  const handleSetDiscrepancy = async (barcode: string, reason: "NOT_FOUND" | "CANCELLED") => {
    setLoading(true);
    try {
      const res = await fetch("/api/handover/mark-discrepancy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: selectedSession?.id,
          barcode: barcode,
          reason: reason,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setSessionItems(prevItems => {
          const updatedItems = prevItems.map(item => {
            if (item.barcode_resi === barcode) {
              const isTogglingOff = item.discrepancy_reason === reason;
              return {
                ...item,
                is_validated_handover: isTogglingOff ? false : true,
                discrepancy_reason: isTogglingOff ? null : reason,
                validated_by: isTogglingOff ? null : (result.data?.validated_by || null),
                validated_at: isTogglingOff ? null : (result.data?.validated_at || null),
              };
            }
            return item;
          });

          const newScanned = updatedItems.filter(i => i.is_validated_handover).length;
          setVerifyProgress({
            scanned: newScanned,
            total: updatedItems.length
          });

          setDiscrepancyReasons(prev => {
            const newReasons = { ...prev };
            const isTogglingOff = newReasons[barcode] === reason;
            if (isTogglingOff) {
              delete newReasons[barcode];
              showToast.info(`✅ ${barcode} dibatalkan dari discrepancy`);
            } else {
              newReasons[barcode] = reason;
              showToast.info(`📝 ${barcode} → ${reason}`);
            }
            return newReasons;
          });

          return updatedItems;
        });
      } else {
        showToast.error(result.message || "Gagal menandai discrepancy");
      }
    } catch (error) {
      showToast.error("Error marking discrepancy");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchResi = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const results = sessionItems.filter(item =>
      (item.barcode_resi ?? "").toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };

  const handleMarkFromSearch = async (barcode: string, reason: "NOT_FOUND" | "CANCELLED") => {
    setLoading(true);
    try {
      const res = await fetch("/api/handover/mark-discrepancy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: selectedSession?.id,
          barcode: barcode,
          reason: reason,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setSessionItems(prevItems => {
          const updatedItems = prevItems.map(item => {
            if (item.barcode_resi === barcode) {
              const isTogglingOff = item.discrepancy_reason === reason;
              return {
                ...item,
                is_validated_handover: isTogglingOff ? false : true,
                discrepancy_reason: isTogglingOff ? null : reason,
                validated_by: isTogglingOff ? null : (result.data?.validated_by || null),
                validated_at: isTogglingOff ? null : (result.data?.validated_at || null),
              };
            }
            return item;
          });

          const newScanned = updatedItems.filter(i => i.is_validated_handover).length;
          setVerifyProgress({
            scanned: newScanned,
            total: updatedItems.length
          });

          setDiscrepancyReasons(prev => {
            const newReasons = { ...prev };
            const isTogglingOff = newReasons[barcode] === reason;
            if (isTogglingOff) {
              delete newReasons[barcode];
              showToast.info(`✅ ${barcode} dibatalkan dari discrepancy`);
            } else {
              newReasons[barcode] = reason;
              showToast.info(`📝 ${barcode} → ${reason}`);
            }
            return newReasons;
          });

          setSearchQuery("");
          setSearchResults([]);

          return updatedItems;
        });
      } else {
        showToast.error(result.message || "Gagal menandai discrepancy");
      }
    } catch (error) {
      showToast.error("Error marking discrepancy");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllDiscrepancy = async () => {
    if (Object.keys(discrepancyReasons).length === 0) {
      showToast.info("Tidak ada discrepancy untuk direset");
      return;
    }

    if (!confirm(`Reset semua ${Object.keys(discrepancyReasons).length} discrepancy?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/handover/reset-discrepancy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: selectedSession?.id,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setDiscrepancyReasons({});
        setSessionItems(prev =>
          prev.map(item => ({
            ...item,
            is_validated_handover: false,
            discrepancy_reason: null,
            validated_by: null,
            validated_at: null
          }))
        );
        setVerifyProgress({
          scanned: 0,
          total: sessionItems.length
        });
        showToast.info("🔄 Semua status discrepancy direset");
      } else {
        showToast.error(result.message || "Gagal reset discrepancy");
      }
    } catch (error) {
      showToast.error("Error resetting discrepancy");
    } finally {
      setLoading(false);
    }
  };

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
        courier_photo_url: courierPhotoUrl,
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
      setVerifyMethod("scan");
      setSearchQuery("");
      setSearchResults([]);
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
    setVerifyMethod("scan");
    setSearchQuery("");
    setSearchResults([]);
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
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-md mx-auto p-4 space-y-4">

            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/menu")}
                className="p-2 hover:bg-white rounded-xl transition-colors border border-slate-200 bg-white"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-widest">
                  Handover
                </p>
                <p className="font-extrabold text-lg text-slate-900 leading-tight">
                  Serah Terima Paket
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex rounded-2xl bg-white border border-slate-200 p-1 shadow-sm">
              <button
                onClick={() => setActiveTab("ready")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "ready"
                    ? "bg-[#0B2B4A] text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Siap Handover ({totalReady})
              </button>
              <button
                onClick={() => setActiveTab("done")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "done"
                    ? "bg-[#0B2B4A] text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Buat Manifest ({totalDone})
              </button>
            </div>

            {/* Session List */}
            <div className="space-y-2">
              <p className="text-slate-500 text-xs uppercase font-bold tracking-widest px-1">
                {activeTab === "ready"
                  ? "Pilih Sesi untuk Di-Handover"
                  : "Session Selesai - Buat Manifest"}
              </p>

              {currentSessions.length === 0 ? (
                <div className="p-8 bg-white border-2 border-dashed border-slate-300 rounded-2xl text-center">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm font-medium">
                    {activeTab === "ready"
                      ? "Semua sesi sudah selesai handover"
                      : "Semua session sudah memiliki manifest"}
                  </p>
                </div>
              ) : (
                currentSessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSession(s)}
                    className={`p-4 rounded-2xl border shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98] bg-white ${
                      activeTab === "ready"
                        ? "border-l-4 border-l-orange-500 border-slate-200"
                        : "border-l-4 border-l-emerald-500 border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-slate-900 font-mono text-sm truncate">
                          {s.session_code}
                        </p>
                        <p className="text-slate-600 text-xs mt-1 truncate">
                          Kurir: <span className="font-semibold">{s.transporter_name}</span>
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {activeTab === "ready" ? "Siap" : "Selesai"}
                        </p>
                        <p className={`text-2xl font-extrabold leading-none ${
                          activeTab === "ready" ? "text-orange-600" : "text-emerald-600"
                        }`}>
                          {activeTab === "ready" ? s.remaining_items : s.total_items}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                      <span>Total: {s.total_items} paket</span>
                      <span className={s.validated_items > 0 ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                        {s.validated_items || 0} sudah di-handover
                      </span>
                    </div>

                    {activeTab === "done" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSession(s);
                          }}
                          className="flex-1 text-[10px] bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white py-2 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <FileText className="w-3 h-3" />
                          Buat Manifest
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
                            className="flex-1 text-[10px] bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-3 h-3" />
                            Tutup Tanpa Manifest
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
              nusaena v1 · HANDOVER
            </footer>
          </div>
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
                  Handover
                </p>
                <p className="font-extrabold text-lg text-slate-900 leading-tight">
                  Pilih Mode
                </p>
              </div>
            </div>

            {/* Session Info */}
            <div className="bg-gradient-to-br from-[#0B2B4A] to-[#1a3d5c] rounded-2xl p-4 shadow-lg">
              <p className="font-mono font-extrabold text-white text-sm truncate">
                {selectedSession.session_code}
              </p>
              <p className="text-white/80 text-xs mt-1 truncate">
                {selectedSession.transporter_name} · {selectedSession.total_items} paket
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-lg font-bold backdrop-blur-sm">
                  📦 {selectedSession.remaining_items} siap handover
                </span>
                {selectedSession.remaining_items === 0 && (
                  <span className="text-[10px] bg-emerald-400/30 text-white px-2.5 py-1 rounded-lg font-bold backdrop-blur-sm">
                    ✅ Selesai - Buat Manifest
                  </span>
                )}
              </div>
            </div>

            {/* Mode Selection */}
            <div className="space-y-3">
              <p className="text-slate-600 text-sm font-medium text-center">
                Apakah total paket sesuai dengan yang diterima kurir?
              </p>

              <button
                onClick={() => handleSelectMode("trust")}
                className="w-full p-4 bg-white border-2 border-emerald-200 rounded-2xl text-left hover:border-emerald-400 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">YA, Total Sesuai</p>
                    <p className="text-xs text-slate-500">Mode Trust · Langsung tanda tangan</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleSelectMode("verify")}
                className="w-full p-4 bg-white border-2 border-amber-200 rounded-2xl text-left hover:border-amber-400 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Search className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">TIDAK, Ada Selisih</p>
                    <p className="text-xs text-slate-500">Mode Verify · Scan ulang paket</p>
                  </div>
                </div>
              </button>
            </div>

            <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
              nusaena v1 · HANDOVER
            </footer>
          </div>
        </div>
      </OperatorShell>
    );
  }

  // =============================================
  // RENDER: Verify Mode
  // =============================================
  if (step === "verify" && selectedSession) {
    const allScanned = verifyProgress.scanned === verifyProgress.total;
    const pendingItems = sessionItems.filter(i => !i.is_validated_handover);

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
                  Verify Mode
                </p>
                <p className="font-extrabold text-lg text-slate-900 leading-tight">
                  Verifikasi Paket
                </p>
              </div>
            </div>

            {/* Progress Card */}
            <div className="bg-gradient-to-br from-[#0B2B4A] to-[#1a3d5c] rounded-2xl p-4 shadow-lg">
              <div className="flex justify-between items-start mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-extrabold text-white text-sm truncate">
                    {selectedSession.session_code}
                  </p>
                  <p className="text-white/70 text-xs mt-0.5 truncate">
                    {selectedSession.transporter_name}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-3xl font-extrabold text-white leading-none">
                    {verifyProgress.scanned}/{verifyProgress.total}
                  </p>
                  <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mt-1">
                    terverifikasi
                  </p>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2.5">
                <div
                  className="bg-white h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${verifyProgress.total > 0 ? (verifyProgress.scanned / verifyProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Method Toggle */}
            <div className="flex rounded-2xl bg-white border border-slate-200 p-1 shadow-sm">
              <button
                onClick={() => {
                  setVerifyMethod("scan");
                  setSearchQuery("");
                  setSearchResults([]);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  verifyMethod === "scan"
                    ? "bg-[#0B2B4A] text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Scan className="w-3.5 h-3.5" />
                Scan Barcode
              </button>
              <button
                onClick={() => {
                  setVerifyMethod("search");
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  verifyMethod === "search"
                    ? "bg-[#0B2B4A] text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Cari & Tandai
              </button>
            </div>

            {/* Scan Method */}
            {verifyMethod === "scan" && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <form onSubmit={(e) => { e.preventDefault(); handleVerifyScan(); }} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Scan className="w-4 h-4" />
                    {allScanned ? "Semua Paket Sudah Discan" : "Scan Barcode Paket"}
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    autoFocus
                    disabled={loading || allScanned}
                    placeholder={allScanned ? "Semua sudah discan" : "Scan resi..."}
                    value={verifyBarcode}
                    onChange={(e) => setVerifyBarcode(e.target.value)}
                    className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-xl text-slate-900 font-mono text-lg font-bold focus:outline-none focus:bg-white transition-all text-center ${
                      allScanned ? "border-emerald-300 bg-emerald-50" : "border-slate-200 focus:border-amber-500"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={loading || allScanned}
                    className={`w-full py-4 font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      allScanned
                        ? "bg-emerald-500 text-white cursor-not-allowed"
                        : "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 active:scale-[0.98]"
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Memproses...
                      </>
                    ) : allScanned ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Selesai
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Verifikasi Paket
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Search Method */}
            {verifyMethod === "search" && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Search className="w-4 h-4" />
                    Cari Resi & Tandai Discrepancy
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cari resi (min 2 karakter)..."
                      value={searchQuery}
                      onChange={(e) => handleSearchResi(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="px-4 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl text-sm font-medium"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {searchResults.length > 0 && (
                    <div className="max-h-60 overflow-y-auto space-y-1.5 border-t border-slate-100 pt-3">
                      {searchResults.map((item) => {
                        const isMarked = item.discrepancy_reason !== null;
                        const isDone = item.is_validated_handover && !isMarked;

                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-xl text-sm border ${
                              isMarked
                                ? "bg-rose-50 border-rose-200"
                                : isDone
                                ? "bg-emerald-50 border-emerald-200"
                                : "bg-white border-slate-200"
                            }`}
                          >
                            <span className="font-mono text-slate-800 truncate">{item.barcode_resi || "-"}</span>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              {isMarked ? (
                                <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {item.discrepancy_reason}
                                </span>
                              ) : isDone ? (
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  DONE
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleMarkFromSearch(item.barcode_resi, "NOT_FOUND")}
                                    className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold rounded-lg transition-colors active:scale-95"
                                  >
                                    Not Found
                                  </button>
                                  <button
                                    onClick={() => handleMarkFromSearch(item.barcode_resi, "CANCELLED")}
                                    className="px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs font-bold rounded-lg transition-colors active:scale-95"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {searchQuery && searchResults.length === 0 && (
                    <div className="text-center py-4 text-sm text-slate-500">
                      Resi "{searchQuery}" tidak ditemukan
                    </div>
                  )}

                  {!searchQuery && (
                    <div className="text-center py-4 text-sm text-slate-400">
                      💡 Ketik minimal 2 karakter untuk mencari resi
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  {pendingItems.length} paket belum diverifikasi
                </p>
                {Object.keys(discrepancyReasons).length > 0 && (
                  <button
                    onClick={handleResetAllDiscrepancy}
                    className="text-[10px] text-rose-500 hover:text-rose-600 font-bold uppercase tracking-wider"
                  >
                    Reset semua
                  </button>
                )}
              </div>

              {pendingItems.length === 0 ? (
                <div className="text-center text-xs text-emerald-600 py-3 font-bold">
                  ✅ Semua paket sudah diverifikasi
                </div>
              ) : (
                pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl text-xs bg-white border border-slate-200 shadow-sm"
                  >
                    <span className="font-mono text-slate-800 truncate">{item.barcode_resi || "-"}</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                      PENDING
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Lanjut Button */}
            <button
              onClick={() => setStep("trust")}
              disabled={
                !allScanned &&
                Object.keys(discrepancyReasons).length === 0
              }
              className={`w-full py-4 font-extrabold rounded-xl transition-all text-sm flex items-center justify-center gap-2 ${
                allScanned || Object.keys(discrepancyReasons).length > 0
                  ? "bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white shadow-lg shadow-[#0B2B4A]/20 active:scale-[0.98]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {allScanned ? (
                <>
                  <PenTool className="w-4 h-4" />
                  Lanjut ke Tanda Tangan (Semua Selesai)
                </>
              ) : Object.keys(discrepancyReasons).length > 0 ? (
                <>
                  <PenTool className="w-4 h-4" />
                  Lanjut ke Tanda Tangan ({Object.keys(discrepancyReasons).length} discrepancy)
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Verifikasi semua paket atau tandai discrepancy
                </>
              )}
            </button>

            {/* Discrepancy Info */}
            {Object.keys(discrepancyReasons).length > 0 && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <p className="text-xs text-rose-700 font-bold">
                    {Object.keys(discrepancyReasons).length} paket bermasalah:
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(discrepancyReasons).map(([barcode, reason]) => (
                    <span key={barcode} className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md font-mono font-bold">
                      {barcode} ({reason})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
              nusaena v1 · HANDOVER
            </footer>
          </div>
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
                    {isVerify ? "Verify Mode" : "Trust Mode"}
                  </p>
                  <p className="font-extrabold text-lg text-slate-900 leading-tight">
                    Tanda Tangan
                  </p>
                </div>
              </div>

              {/* Session Info */}
              <div className={`rounded-2xl p-4 shadow-sm border ${
                isVerify ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
              }`}>
                <p className="font-mono font-extrabold text-slate-900 text-sm truncate">
                  {selectedSession.session_code}
                </p>
                <p className="text-xs text-slate-600 mt-0.5 truncate">
                  {selectedSession.transporter_name} · {selectedSession.total_items} paket
                </p>
                {isVerify && Object.keys(discrepancyReasons).length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-600 font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {Object.keys(discrepancyReasons).length} paket bermasalah
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Nama Kurir *
                  </label>
                  <input
                    type="text"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="Masukkan nama kurir"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Nama Security *
                  </label>
                  <input
                    type="text"
                    value={securityName}
                    onChange={(e) => setSecurityName(e.target.value)}
                    placeholder="Masukkan nama security"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    Nomor Kendaraan *
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="Contoh: B 1234 ABC"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all uppercase"
                  />
                </div>

                {/* Foto Kurir */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    Foto Kurir (Bukti Handover)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => document.getElementById('photoInput')?.click()}
                      className="px-4 py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold rounded-xl text-sm transition-colors flex items-center gap-2 active:scale-[0.98]"
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          Ambil Foto
                        </>
                      )}
                    </button>
                    <input
                      id="photoInput"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                    {courierPhotoUrl && (
                      <div className="relative inline-block">
                        <img
                          src={courierPhotoUrl}
                          alt="Foto Kurir"
                          className="w-16 h-16 object-cover rounded-xl border-2 border-slate-200 shadow-sm"
                        />
                        <button
                          onClick={() => setCourierPhotoUrl("")}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center shadow-md hover:bg-rose-600"
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Foto akan diambil langsung dari kamera HP (opsional)
                  </p>
                </div>

                {/* Tanda Tangan */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      TTD Kurir *
                    </label>
                    <button
                      onClick={() => setShowCourierSignature(true)}
                      className={`w-full py-3 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-1.5 ${
                        courierSignature
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-[#0B2B4A] hover:bg-blue-50"
                      }`}
                    >
                      {courierSignature ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Tersimpan
                        </>
                      ) : (
                        <>
                          <PenTool className="w-4 h-4" />
                          Tanda Tangan
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      TTD Security *
                    </label>
                    <button
                      onClick={() => setShowSecuritySignature(true)}
                      className={`w-full py-3 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-1.5 ${
                        securitySignature
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-[#0B2B4A] hover:bg-blue-50"
                      }`}
                    >
                      {securitySignature ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Tersimpan
                        </>
                      ) : (
                        <>
                          <PenTool className="w-4 h-4" />
                          Tanda Tangan
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {courierSignature && securitySignature && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <p className="text-xs text-emerald-700 font-bold">
                      Kedua tanda tangan sudah tersimpan
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleFinalize}
                  disabled={loading || !courierSignature || !securitySignature}
                  className="w-full py-4 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white font-extrabold rounded-xl text-base tracking-wide shadow-lg shadow-[#0B2B4A]/20 active:scale-[0.98] transition-all uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Selesaikan Handover
                    </>
                  )}
                </button>
              </div>

              <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
                nusaena v1 · HANDOVER
              </footer>
            </div>
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
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-md mx-auto p-4 flex items-center justify-center min-h-[80vh]">
            <div className="text-center w-full">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                Handover Berhasil!
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                {mode === "trust"
                  ? "Semua paket DONE, tidak ada discrepancy"
                  : `Handover selesai dengan ${Object.keys(discrepancyReasons).length} discrepancy`}
              </p>
              <button
                onClick={handleReset}
                className="w-full py-4 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white font-extrabold rounded-xl shadow-lg shadow-[#0B2B4A]/20 active:scale-[0.98] transition-all"
              >
                Kembali ke Daftar
              </button>
            </div>
          </div>
        </div>
      </OperatorShell>
    );
  }

  return null;
}