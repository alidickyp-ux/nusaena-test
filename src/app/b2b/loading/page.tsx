"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Truck,
  Package,
  CheckCircle2,
  AlertCircle,
  Scan,
  ChevronRight,
  Building2,
  FileText,
  PenTool,
  RotateCcw,
  Boxes,
} from "lucide-react";
import showToast from '@/lib/toast';
import { playAcceptedSound, playRejectedSound } from "@/lib/sound";
import OperatorShell from "@/components/mobile/OperatorShell";
import SignaturePadModal from "@/components/mobile/SignaturePad";

interface Vendor {
  vendor_id: number;
  vendor_name: string;
  weight_price: number;
  volume_price: number;
  is_active: boolean;
}

interface ReferenceData {
  reference: string;
  site?: string | null;
  store_name?: string | null;
  total_box: number;
  total_weight: number;
  loaded_box: number;
  staging_box: number;
  putaway_at: string;
  is_complete?: boolean;
}

interface BoxData {
  id: string;
  reference: string;
  box_id: string;
  box_number: string;
  weight: string;
  loading_status: string;
}

export default function B2BLoadingPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [operatorId, setOperatorId] = useState("");

  const [step, setStep] = useState<"vendor" | "reference" | "handover" | "complete">("vendor");

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | "">("");
  const [selectedVendorName, setSelectedVendorName] = useState("");
  const [references, setReferences] = useState<ReferenceData[]>([]);
  const [checkedReferences, setCheckedReferences] = useState<string[]>([]);
  const [activeReferences, setActiveReferences] = useState<string[]>([]);
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [scanBarcode, setScanBarcode] = useState("");
  const [remainingBoxes, setRemainingBoxes] = useState(0);
  const [completedReferences, setCompletedReferences] = useState<string[]>([]);

  const [driver, setDriver] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [security, setSecurity] = useState("");
  const [policeNumber, setPoliceNumber] = useState("");
  const [driverSignature, setDriverSignature] = useState("");
  const [securitySignature, setSecuritySignature] = useState("");
  const [showDriverSignature, setShowDriverSignature] = useState(false);
  const [showSecuritySignature, setShowSecuritySignature] = useState(false);

  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [deliveryNumber, setDeliveryNumber] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const { user } = await res.json();
          setOperatorId(user.id);
          setOperatorName(user.full_name);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await fetch("/api/b2b/loading/vendors");
        if (res.ok) {
          const data = await res.json();
          setVendors(data.data || []);
        }
      } catch (error) {
        showToast.error("Gagal memuat daftar vendor");
      }
    };
    fetchVendors();
  }, []);

  const fetchReferences = async (vendorName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/b2b/loading/references/${encodeURIComponent(vendorName)}`);
      if (res.ok) {
        const data = await res.json();
        const refs = data.data?.references || [];

        const refsWithStatus = refs.map((ref: ReferenceData) => ({
          ...ref,
          is_complete: ref.loaded_box === ref.total_box
        }));

        setReferences(refsWithStatus);

        const completed = refsWithStatus
          .filter((ref: ReferenceData) => ref.is_complete)
          .map((ref: ReferenceData) => ref.reference);
        setCompletedReferences(completed);

        if (refsWithStatus.length === 0) {
          setStatusMsg({
            text: `📭 Tidak ada reference yang siap loading untuk ${vendorName}`,
            type: "info"
          });
        } else {
          const completedCount = completed.length;
          const totalCount = refsWithStatus.length;
          setStatusMsg({
            text: `📦 ${totalCount} reference (${completedCount} selesai)`,
            type: "success"
          });
        }
      }
    } catch (error) {
      showToast.error("Error fetching references");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVendor = () => {
    if (!selectedVendorId) {
      showToast.error("Pilih vendor terlebih dahulu");
      return;
    }

    const vendor = vendors.find(v => v.vendor_id === selectedVendorId);
    if (!vendor) {
      showToast.error("Vendor tidak ditemukan");
      return;
    }

    setSelectedVendorName(vendor.vendor_name);
    setCompletedReferences([]);
    setCheckedReferences([]);
    setActiveReferences([]);
    fetchReferences(vendor.vendor_name);
    setStep("reference");
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const toggleReferenceChecked = (reference: string) => {
    if (completedReferences.includes(reference)) {
      showToast.info(`Reference ${reference} sudah selesai`);
      return;
    }
    setCheckedReferences((prev) =>
      prev.includes(reference)
        ? prev.filter((r) => r !== reference)
        : [...prev, reference]
    );
  };

  const handleConfirmReferences = async () => {
    if (checkedReferences.length === 0) {
      showToast.error("Pilih minimal 1 reference terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/b2b/loading/references-boxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_name: selectedVendorName,
          references: checkedReferences,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveReferences(checkedReferences);
        setBoxes(data.data?.boxes || []);
        const remaining = data.data?.staging_box ?? 0;
        setRemainingBoxes(remaining);
        setStatusMsg({
          text: `📦 ${remaining} box perlu discan ulang untuk validasi`,
          type: "info",
        });
        setTimeout(() => inputRef.current?.focus(), 200);
      } else {
        showToast.error("Gagal mengambil daftar box");
      }
    } catch (error) {
      showToast.error("Error fetching boxes");
    } finally {
      setLoading(false);
    }
  };

  const handleScanBox = async () => {
    const cleanBarcode = scanBarcode.trim();
    if (!cleanBarcode) return;

    setLoading(true);
    try {
      const res = await fetch("/api/b2b/loading/validate-box", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          references: activeReferences,
          box_id: cleanBarcode,
          vendor_name: selectedVendorName,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        playAcceptedSound();
        showToast.success(result.message);

        const matchedRef = result.matched_reference as string;

        setBoxes(prev =>
          prev.map(box =>
            box.box_id === cleanBarcode
              ? { ...box, loading_status: 'loading_complete' }
              : box
          )
        );
        setRemainingBoxes(result.remaining);
        setScanBarcode("");

        if (result.reference_done) {
          setCompletedReferences(prev =>
            prev.includes(matchedRef) ? prev : [...prev, matchedRef]
          );
          setReferences(prev =>
            prev.map(ref =>
              ref.reference === matchedRef
                ? { ...ref, is_complete: true, loaded_box: ref.total_box }
                : ref
            )
          );
        }

        if (result.all_done) {
          setStatusMsg({
            text: `✅ ${activeReferences.length > 1 ? "Semua reference terpilih" : `Reference ${activeReferences[0]}`} selesai!`,
            type: "success"
          });

          setTimeout(() => {
            setActiveReferences([]);
            setCheckedReferences([]);
            setBoxes([]);
            fetchReferences(selectedVendorName);
          }, 1500);
        } else {
          setStatusMsg({
            text: `✅ ${cleanBarcode} valid! ${result.remaining} box tersisa`,
            type: "success"
          });
        }
        setTimeout(() => inputRef.current?.focus(), 200);
      } else {
        playRejectedSound();
        showToast.error(result.message || "Box tidak valid");
      }
    } catch (error) {
      showToast.error("Error validating box");
      playRejectedSound();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitHandover = async () => {
    if (!driver || !operatorName || !security || !policeNumber) {
      showToast.error("Semua field wajib diisi");
      return;
    }
    if (!driverSignature || !securitySignature) {
      showToast.error("Tanda tangan wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const completedRefs = references
        .filter(ref => ref.is_complete)
        .map(ref => ref.reference);

      if (completedRefs.length === 0) {
        showToast.error("Tidak ada reference yang selesai");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/b2b/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_name: selectedVendorName,
          references: completedRefs,
          driver,
          operator: operatorName,
          security,
          police_number: policeNumber,
          driver_sign: driverSignature,
          security_sign: securitySignature,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast.success(result.message);
        setDeliveryNumber(result.data?.delivery_number || "");
        setStep("complete");
      } else {
        showToast.error(result.message || "Gagal submit handover");
      }
    } catch (error) {
      showToast.error("Error submitting handover");
    } finally {
      setLoading(false);
    }
  };

  const handleDriverSignatureSave = (signature: string) => {
    setDriverSignature(signature);
    setShowDriverSignature(false);
    showToast.success("✅ Tanda tangan driver tersimpan");
  };

  const handleSecuritySignatureSave = (signature: string) => {
    setSecuritySignature(signature);
    setShowSecuritySignature(false);
    showToast.success("✅ Tanda tangan security tersimpan");
  };

  // 🔥 Tombol back: langsung ke menu
  const handleBack = () => {
    if (step === "vendor") {
      router.push("/menu");
    } else if (step === "reference") {
      setStep("vendor");
      setSelectedVendorId("");
      setSelectedVendorName("");
      setReferences([]);
      setCompletedReferences([]);
      setCheckedReferences([]);
      setActiveReferences([]);
      setStatusMsg({ text: "", type: "" });
    } else if (step === "handover") {
      setStep("reference");
      setActiveReferences([]);
      setCheckedReferences([]);
      setBoxes([]);
      setStatusMsg({ text: "", type: "" });
    }
  };

  const handleReset = () => {
    setStep("vendor");
    setSelectedVendorId("");
    setSelectedVendorName("");
    setCheckedReferences([]);
    setActiveReferences([]);
    setReferences([]);
    setBoxes([]);
    setCompletedReferences([]);
    setStatusMsg({ text: "", type: "" });
    setScanBarcode("");
    setDriver("");
    setOperatorName("");
    setSecurity("");
    setPoliceNumber("");
    setDriverSignature("");
    setSecuritySignature("");
    setDeliveryNumber("");
  };

  // =============================================
  // RENDER: Select Vendor
  // =============================================
  if (step === "vendor") {
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
                  B2B Loading
                </p>
                <p className="font-extrabold text-lg text-slate-900 leading-tight">
                  Pilih Vendor
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

            {/* Form Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Building2 className="w-4 h-4" />
                Pilih Vendor / Ekspedisi
              </div>

              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(Number(e.target.value))}
                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all"
              >
                <option value="">-- Pilih Vendor --</option>
                {vendors.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleSelectVendor}
                disabled={loading || !selectedVendorId}
                className="w-full py-4 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white font-extrabold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#0B2B4A]/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Truck className="w-5 h-5" />
                    Cari Reference
                  </>
                )}
              </button>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-800 mb-1">Informasi</p>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Pilih vendor/ekspedisi untuk melihat daftar reference yang siap loading.
                  </p>
                </div>
              </div>
            </div>

            <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
              nusaena v1 · B2B LOADING
            </footer>
          </div>
        </div>
      </OperatorShell>
    );
  }

  // =============================================
  // RENDER: Select Reference
  // =============================================
  if (step === "reference") {

    if (activeReferences.length > 0) {
      const stagingBoxes = boxes.filter((b) => b.loading_status === "staging");
      const doneBoxes = boxes.filter((b) => b.loading_status !== "staging");

      return (
        <OperatorShell>
          <div className="min-h-screen bg-slate-50">
            <div className="max-w-md mx-auto p-4 space-y-4">

              {/* Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveReferences([]);
                    setCheckedReferences([]);
                    setBoxes([]);
                    setStatusMsg({ text: "", type: "" });
                  }}
                  className="p-2 hover:bg-white rounded-xl transition-colors border border-slate-200 bg-white"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                  <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-widest">
                    B2B Loading
                  </p>
                  <p className="font-extrabold text-lg text-slate-900 leading-tight">
                    Validasi Box
                  </p>
                </div>
              </div>

              {/* Progress Card */}
              <div className="bg-gradient-to-br from-[#0B2B4A] to-[#1a3d5c] rounded-2xl p-4 shadow-lg">
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {activeReferences.map((ref) => (
                        <span key={ref} className="font-bold text-white font-mono text-xs bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
                          {ref}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-white/70">{selectedVendorName}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-3xl font-extrabold text-white leading-none">
                      {boxes.length - remainingBoxes}/{boxes.length}
                    </p>
                    <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mt-1">tervalidasi</p>
                  </div>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2.5">
                  <div
                    className="bg-white h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        boxes.length > 0 ? ((boxes.length - remainingBoxes) / boxes.length) * 100 : 0
                      }%`,
                    }}
                  />
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

              {/* Scan Form */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <form onSubmit={(e) => { e.preventDefault(); handleScanBox(); }} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Scan className="w-4 h-4" />
                    {remainingBoxes === 0 ? "✅ Semua box sudah divalidasi" : "Scan Ulang Barcode Box"}
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    autoFocus
                    disabled={loading || remainingBoxes === 0}
                    placeholder={remainingBoxes === 0 ? "Semua sudah divalidasi" : "Scan box_id..."}
                    value={scanBarcode}
                    onChange={(e) => setScanBarcode(e.target.value)}
                    className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-xl text-slate-900 font-mono text-lg font-bold focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all ${
                      remainingBoxes === 0 ? "border-emerald-300 bg-emerald-50" : "border-slate-200"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={loading || remainingBoxes === 0}
                    className={`w-full py-4 font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      remainingBoxes === 0
                        ? "bg-emerald-500 text-white cursor-not-allowed"
                        : "bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white shadow-lg shadow-[#0B2B4A]/20 active:scale-[0.98]"
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Memproses...
                      </>
                    ) : remainingBoxes === 0 ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Selesai
                      </>
                    ) : (
                      <>
                        <Scan className="w-5 h-5" />
                        Validasi Box
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Box List */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-1 mb-1">
                  <Boxes className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    {stagingBoxes.length} box perlu discan ulang
                  </p>
                </div>

                {stagingBoxes.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-xl text-xs bg-white border border-slate-200 shadow-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <span className="font-mono font-medium text-slate-800 truncate">{b.box_id}</span>
                      {activeReferences.length > 1 && (
                        <span className="text-[9px] text-slate-400 font-mono flex-shrink-0">{b.reference}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      PENDING
                    </span>
                  </div>
                ))}

                {doneBoxes.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-xl text-xs bg-emerald-50 border border-emerald-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <span className="font-mono font-medium text-emerald-800 truncate">{b.box_id}</span>
                      {activeReferences.length > 1 && (
                        <span className="text-[9px] text-emerald-500 font-mono flex-shrink-0">{b.reference}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      DONE
                    </span>
                  </div>
                ))}
              </div>

              <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
                nusaena v1 · B2B LOADING
              </footer>
            </div>
          </div>
        </OperatorShell>
      );
    }

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
                  B2B Loading
                </p>
                <p className="font-extrabold text-lg text-slate-900 leading-tight">
                  Pilih Reference
                </p>
              </div>
            </div>

            {/* Progress Card */}
            <div className="bg-gradient-to-br from-[#0B2B4A] to-[#1a3d5c] rounded-2xl p-4 shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">Vendor</p>
                  <p className="font-bold text-white text-sm truncate">{selectedVendorName}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">Progress</p>
                  <p className="text-lg font-extrabold text-white leading-none">
                    {completedReferences.length}/{references.length}
                  </p>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all"
                  style={{
                    width: `${references.length > 0 ? (completedReferences.length / references.length) * 100 : 0}%`
                  }}
                />
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

            {/* Reference List */}
            <div className="space-y-2">
              <p className="text-slate-500 text-xs uppercase font-bold tracking-widest px-1">
                Pilih Reference untuk Di-Loading
              </p>
              {references.length === 0 ? (
                <div className="p-8 bg-white border-2 border-dashed border-slate-300 rounded-2xl text-center text-slate-500 text-sm">
                  Tidak ada reference yang siap loading
                </div>
              ) : (
                references.map((ref) => {
                  const progress = ref.total_box > 0 ? (ref.loaded_box / ref.total_box) * 100 : 0;
                  const isComplete = ref.is_complete || false;
                  const isChecked = checkedReferences.includes(ref.reference);

                  return (
                    <button
                      key={ref.reference}
                      onClick={() => toggleReferenceChecked(ref.reference)}
                      disabled={isComplete}
                      className={`w-full p-4 rounded-2xl border shadow-sm transition-all text-left active:scale-[0.98] ${
                        isComplete
                          ? "border-emerald-300 bg-emerald-50/50 cursor-not-allowed"
                          : isChecked
                          ? "border-[#0B2B4A] bg-blue-50 hover:shadow-md"
                          : "border-slate-200 bg-white hover:shadow-md"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {!isComplete && (
                            <div
                              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isChecked ? "bg-[#0B2B4A] border-[#0B2B4A]" : "border-slate-300 bg-white"
                              }`}
                            >
                              {isChecked && (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-mono font-bold text-slate-900 text-sm">
                                {ref.reference}
                              </p>
                              {isComplete && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                  ✅ SELESAI
                                </span>
                              )}
                            </div>
                            {(ref.site || ref.store_name) && (
                              <p className="text-xs text-slate-500 mt-1 truncate">
                                {ref.site && <span className="font-mono">{ref.site}</span>}
                                {ref.site && ref.store_name && " · "}
                                {ref.store_name && <span>{ref.store_name}</span>}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 mt-0.5">
                              {ref.total_box} box · {ref.total_weight}kg
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className={`text-xs font-bold ${isComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {ref.loaded_box}/{ref.total_box}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-[#0B2B4A]'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Tombol OK */}
            {checkedReferences.length > 0 && (
              <button
                onClick={handleConfirmReferences}
                disabled={loading}
                className="w-full py-4 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white font-extrabold rounded-xl text-base shadow-lg shadow-[#0B2B4A]/25 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memuat...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    OK — Lanjut Scan ({checkedReferences.length} reference dipilih)
                  </>
                )}
              </button>
            )}

            {/* Tombol Selesaikan Loading */}
            {completedReferences.length > 0 && (
              <button
                onClick={() => setStep("handover")}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-base shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Selesaikan Loading ({completedReferences.length} reference)
              </button>
            )}

            <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
              nusaena v1 · B2B LOADING
            </footer>
          </div>
        </div>
      </OperatorShell>
    );
  }

  // =============================================
  // RENDER: Handover Form
  // =============================================
  if (step === "handover") {
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
                    B2B Loading
                  </p>
                  <p className="font-extrabold text-lg text-slate-900 leading-tight">
                    Handover
                  </p>
                </div>
              </div>

              {/* Success Card */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-bold">Semua reference selesai!</p>
                    <p className="text-xs text-white/80 truncate">
                      {completedReferences.length} reference · {selectedVendorName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <PenTool className="w-4 h-4" />
                  Form Handover
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Nama Driver *
                  </label>
                  <input
                    type="text"
                    value={driver}
                    onChange={(e) => setDriver(e.target.value)}
                    placeholder="Masukkan nama driver"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Nama Operator *
                  </label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="Masukkan nama operator"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Nama Security *
                  </label>
                  <input
                    type="text"
                    value={security}
                    onChange={(e) => setSecurity(e.target.value)}
                    placeholder="Masukkan nama security"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Nomor Polisi Kendaraan *
                  </label>
                  <input
                    type="text"
                    value={policeNumber}
                    onChange={(e) => setPoliceNumber(e.target.value)}
                    placeholder="Contoh: B 1234 ABC"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      TTD Driver *
                    </label>
                    <button
                      onClick={() => setShowDriverSignature(true)}
                      className={`w-full py-3 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-1.5 ${
                        driverSignature
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-[#0B2B4A] hover:bg-blue-50"
                      }`}
                    >
                      {driverSignature ? (
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

                <button
                  onClick={handleSubmitHandover}
                  disabled={loading || !driverSignature || !securitySignature}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
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
                nusaena v1 · B2B LOADING
              </footer>
            </div>
          </div>
        </OperatorShell>

        {showDriverSignature && (
          <SignaturePadModal
            title="Tanda Tangan Driver"
            subtitle="Silakan tanda tangan di area di bawah ini"
            onSave={handleDriverSignatureSave}
            onClose={() => setShowDriverSignature(false)}
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
                Loading Berhasil!
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                Handover B2B telah selesai
              </p>

              {deliveryNumber && (
                <div className="inline-block bg-white border-2 border-emerald-300 rounded-2xl px-6 py-4 shadow-lg mb-6">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">
                    DN Number
                  </p>
                  <p className="font-mono font-extrabold text-xl text-emerald-800">
                    {deliveryNumber}
                  </p>
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full py-4 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white font-extrabold rounded-xl shadow-lg shadow-[#0B2B4A]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Kembali ke Daftar Vendor
              </button>
            </div>
          </div>
        </div>
      </OperatorShell>
    );
  }

  return null;
}