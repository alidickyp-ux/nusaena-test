"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import showToast, { withToast } from '@/lib/toast';
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
  
  // Step
  const [step, setStep] = useState<"vendor" | "reference" | "handover" | "complete">("vendor");
  
  // Data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | "">("");
  const [selectedVendorName, setSelectedVendorName] = useState("");
  const [references, setReferences] = useState<ReferenceData[]>([]);
  // 🔥 checkedReferences: reference yang dicentang di daftar (belum dikonfirmasi)
  // activeReferences: reference yang sudah dikonfirmasi ("OK") dan sedang discan bareng
  const [checkedReferences, setCheckedReferences] = useState<string[]>([]);
  const [activeReferences, setActiveReferences] = useState<string[]>([]);
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [scanBarcode, setScanBarcode] = useState("");
  const [remainingBoxes, setRemainingBoxes] = useState(0);
  const [completedReferences, setCompletedReferences] = useState<string[]>([]);
  
  // Handover form
  const [driver, setDriver] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [security, setSecurity] = useState("");
  const [policeNumber, setPoliceNumber] = useState("");
  const [driverSignature, setDriverSignature] = useState("");
  const [securitySignature, setSecuritySignature] = useState("");
  const [showDriverSignature, setShowDriverSignature] = useState(false);
  const [showSecuritySignature, setShowSecuritySignature] = useState(false);
  
  // Status
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [deliveryNumber, setDeliveryNumber] = useState("");

  // Fetch user
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

  // Fetch vendors
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

  // Fetch references by vendor
  const fetchReferences = async (vendorName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/b2b/loading/references/${encodeURIComponent(vendorName)}`);
      if (res.ok) {
        const data = await res.json();
        const refs = data.data?.references || [];
        
        // 🔥 Tandai reference yang sudah selesai
        const refsWithStatus = refs.map((ref: ReferenceData) => ({
          ...ref,
          is_complete: ref.loaded_box === ref.total_box
        }));
        
        setReferences(refsWithStatus);
        
        // 🔥 Update completed references
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

  // 🔥 Handle select vendor
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

  // 🔥 Centang / hapus centang reference di daftar (belum langsung fetch box)
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

  // 🔥 Konfirmasi reference yang sudah dicentang ("OK") — ambil gabungan box
  // dari semua reference yang dipilih, lalu masuk ke layar scan bareng
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

  // 🔥 Handle scan box validation — dicek terhadap semua activeReferences (batch)
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
          // 🔥 Reference ini (salah satu dari batch) sudah selesai
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
          // 🔥 Semua reference dalam batch ini sudah selesai
          setStatusMsg({
            text: `✅ ${activeReferences.length > 1 ? "Semua reference terpilih" : `Reference ${activeReferences[0]}`} selesai!`,
            type: "success"
          });

          // 🔥 Kembali ke daftar reference setelah 1.5 detik
          setTimeout(() => {
            setActiveReferences([]);
            setCheckedReferences([]);
            setBoxes([]);
            // Refresh references
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

  // 🔥 Submit handover untuk semua reference
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
      // 🔥 Kirim semua reference yang sudah selesai
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

  // Signature handlers
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

  const handleBack = () => {
    if (step === "reference") {
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
    } else {
      router.push("/b2b");
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
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
                B2B Loading
              </p>
              <p className="font-extrabold text-lg text-stone-900">Pilih Vendor</p>
            </div>
            <button
              onClick={handleBack}
              className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
            >
              ← Kembali
            </button>
          </div>

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

          <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
            <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest">
              Pilih Vendor / Ekspedisi
            </label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(Number(e.target.value))}
              className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-purple-500"
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
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "⏳ Memproses..." : "🔍 Cari Reference"}
            </button>
          </div>

          <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
            nusaena v1 · B2B LOADING
          </footer>
        </div>
      </OperatorShell>
    );
  }

  // =============================================
  // RENDER: Select Reference
  // =============================================
  if (step === "reference") {

    // 🔥 Kalau sudah konfirmasi reference (OK), tampilkan layar scan box gabungan
    if (activeReferences.length > 0) {
      const stagingBoxes = boxes.filter((b) => b.loading_status === "staging");
      const doneBoxes = boxes.filter((b) => b.loading_status !== "staging");

      return (
        <OperatorShell>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
                  B2B Loading
                </p>
                <p className="font-extrabold text-lg text-stone-900">Validasi Box</p>
              </div>
              <button
                onClick={() => {
                  setActiveReferences([]);
                  setCheckedReferences([]);
                  setBoxes([]);
                  setStatusMsg({ text: "", type: "" });
                }}
                className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
              >
                ← Kembali
              </button>
            </div>

            <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex flex-wrap gap-1">
                    {activeReferences.map((ref) => (
                      <span key={ref} className="font-bold text-purple-800 font-mono text-xs bg-purple-100 px-2 py-0.5 rounded-md">
                        {ref}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-purple-600 mt-1">{selectedVendorName}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-700">
                    {boxes.length - remainingBoxes}/{boxes.length}
                  </p>
                  <p className="text-[10px] text-purple-500">tervalidasi</p>
                </div>
              </div>
              <div className="mt-2 w-full bg-purple-200 rounded-full h-2.5">
                <div
                  className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      boxes.length > 0 ? ((boxes.length - remainingBoxes) / boxes.length) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>

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

            <div className="bg-white p-4 rounded-2xl border border-stone-200">
              <form onSubmit={(e) => { e.preventDefault(); handleScanBox(); }} className="space-y-3">
                <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest">
                  {remainingBoxes === 0 ? "✅ Semua box sudah divalidasi" : "Scan Ulang Barcode Box"}
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  autoFocus
                  disabled={loading || remainingBoxes === 0}
                  placeholder={remainingBoxes === 0 ? "Semua sudah divalidasi" : "Scan box_id..."}
                  value={scanBarcode}
                  onChange={(e) => setScanBarcode(e.target.value)}
                  className={`w-full px-4 py-3 bg-stone-50 border-2 rounded-xl text-stone-900 font-mono text-lg font-semibold focus:outline-none focus:border-purple-500 ${
                    remainingBoxes === 0 ? "border-emerald-300 bg-emerald-50" : "border-stone-300"
                  }`}
                />
                <button
                  type="submit"
                  disabled={loading || remainingBoxes === 0}
                  className={`w-full py-3 font-bold rounded-xl transition-all ${
                    remainingBoxes === 0
                      ? "bg-emerald-500 text-white cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  {loading ? "⏳ Memproses..." : remainingBoxes === 0 ? "✅ Selesai" : "🔍 Validasi Box"}
                </button>
              </form>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-stone-400 font-medium px-1">
                {stagingBoxes.length} box perlu discan ulang
              </p>
              {stagingBoxes.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-lg text-xs bg-white border border-stone-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{b.box_id}</span>
                    {activeReferences.length > 1 && (
                      <span className="text-[9px] text-stone-400 font-mono">{b.reference}</span>
                    )}
                  </div>
                  <span>⏳ Pending</span>
                </div>
              ))}
              {doneBoxes.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-lg text-xs bg-emerald-50 text-emerald-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{b.box_id}</span>
                    {activeReferences.length > 1 && (
                      <span className="text-[9px] text-emerald-500 font-mono">{b.reference}</span>
                    )}
                  </div>
                  <span>✅ DONE</span>
                </div>
              ))}
            </div>

            <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
              nusaena v1 · B2B LOADING
            </footer>
          </div>
        </OperatorShell>
      );
    }

    return (
      <OperatorShell>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
                B2B Loading
              </p>
              <p className="font-extrabold text-lg text-stone-900">Pilih Reference</p>
            </div>
            <button
              onClick={handleBack}
              className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
            >
              ← Kembali
            </button>
          </div>

          <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-purple-600 font-medium">Vendor</p>
                <p className="font-bold text-stone-900">{selectedVendorName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-purple-600 font-medium">Progress</p>
                <p className="text-sm font-bold text-purple-700">
                  {completedReferences.length}/{references.length}
                </p>
              </div>
            </div>
            <div className="mt-2 w-full bg-purple-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ 
                  width: `${references.length > 0 ? (completedReferences.length / references.length) * 100 : 0}%` 
                }}
              />
            </div>
          </div>

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

          <div className="space-y-2">
            <p className="text-stone-500 text-xs uppercase font-bold tracking-widest px-1">
              Pilih Reference untuk Di-Loading
            </p>
            {references.length === 0 ? (
              <div className="p-8 bg-white border-2 border-dashed border-stone-300 rounded-2xl text-center text-stone-500 text-sm">
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
                    className={`w-full p-4 rounded-2xl border-l-4 border shadow-sm transition-all text-left active:scale-[0.98] ${
                      isComplete
                        ? "border-l-emerald-500 border-stone-200 bg-emerald-50/30 cursor-not-allowed"
                        : isChecked
                        ? "border-l-purple-600 border-purple-300 bg-purple-50 hover:shadow-md"
                        : "border-l-purple-500 border-stone-200 bg-white hover:shadow-md"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        {!isComplete && (
                          <div
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                              isChecked ? "bg-purple-600 border-purple-600" : "border-stone-300 bg-white"
                            }`}
                          >
                            {isChecked && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                        <div>
                          <p className="font-mono font-bold text-stone-900">
                            {ref.reference}
                            {isComplete && (
                              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                ✅ Selesai
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-stone-400">
                            {ref.total_box} box · {ref.total_weight}kg
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${isComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {ref.loaded_box}/{ref.total_box}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-stone-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-purple-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* 🔥 TOMBOL OK - konfirmasi reference yang dicentang, lanjut ke layar scan gabungan */}
          {checkedReferences.length > 0 && (
            <button
              onClick={handleConfirmReferences}
              disabled={loading}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl text-base shadow-lg shadow-purple-600/25 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "⏳ Memuat..." : `✅ OK — Lanjut Scan (${checkedReferences.length} reference dipilih)`}
            </button>
          )}

          {/* 🔥 TOMBOL SELESAIKAN LOADING - Bisa lanjut kalau minimal 1 reference sudah selesai.
              Vendor bisa punya beberapa reference; tidak wajib semua selesai dulu —
              operator yang menentukan kapan cukup untuk handover. */}
          {completedReferences.length > 0 && (
            <button
              onClick={() => setStep("handover")}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-base shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all"
            >
              ✅ Selesaikan Loading ({completedReferences.length} reference)
            </button>
          )}

          <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
            nusaena v1 · B2B LOADING
          </footer>
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
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
                  B2B Loading
                </p>
                <p className="font-extrabold text-lg text-stone-900">Handover</p>
              </div>
              <button
                onClick={handleBack}
                className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
              >
                ← Kembali
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
              <p className="text-sm text-emerald-700 font-bold text-center">
                🎉 Semua reference selesai!
              </p>
              <p className="text-xs text-center text-stone-500">
                {completedReferences.length} reference · Vendor: {selectedVendorName}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-emerald-200 space-y-3">
              <p className="text-xs text-center text-stone-500">
                Isi form handover untuk menyelesaikan loading
              </p>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Nama Driver *
                </label>
                <input
                  type="text"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  placeholder="Masukkan nama driver"
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Nama Operator *
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Masukkan nama operator"
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Nama Security *
                </label>
                <input
                  type="text"
                  value={security}
                  onChange={(e) => setSecurity(e.target.value)}
                  placeholder="Masukkan nama security"
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Nomor Polisi Kendaraan *
                </label>
                <input
                  type="text"
                  value={policeNumber}
                  onChange={(e) => setPoliceNumber(e.target.value)}
                  placeholder="Contoh: B 1234 ABC"
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Tanda Tangan Driver *
                  </label>
                  <button
                    onClick={() => setShowDriverSignature(true)}
                    className={`w-full py-3 rounded-xl border-2 font-medium transition-all ${
                      driverSignature
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-dashed border-stone-300 bg-stone-50 text-stone-500 hover:border-purple-300 hover:bg-purple-50"
                    }`}
                  >
                    {driverSignature ? "✅ Tersimpan" : "✍️ Tanda Tangan"}
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
                        : "border-dashed border-stone-300 bg-stone-50 text-stone-500 hover:border-purple-300 hover:bg-purple-50"
                    }`}
                  >
                    {securitySignature ? "✅ Tersimpan" : "✍️ Tanda Tangan"}
                  </button>
                </div>
              </div>

              <button
                onClick={handleSubmitHandover}
                disabled={loading || !driverSignature || !securitySignature}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "⏳ Memproses..." : "✅ Selesaikan Handover"}
              </button>
            </div>
          </div>
        </OperatorShell>

        {/* Signature Modals */}
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
        <div className="p-4 space-y-4">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-emerald-600">Loading Berhasil!</h2>
            <p className="text-stone-500 mt-2">
              Handover B2B telah selesai
            </p>
            {deliveryNumber && (
              <div className="mt-4 inline-block bg-emerald-50 border-2 border-emerald-300 rounded-xl px-6 py-3">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">
                  DN Number
                </p>
                <p className="font-mono font-extrabold text-xl text-emerald-800 mt-1">
                  {deliveryNumber}
                </p>
              </div>
            )}
            <div>
              <button
                onClick={handleReset}
                className="mt-6 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl"
              >
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