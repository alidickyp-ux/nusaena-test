"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Scan,
  MapPin,
  Package,
  Edit3,
  X,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import showToast from '@/lib/toast';
import { playAcceptedSound, playRejectedSound } from "@/lib/sound";
import OperatorShell from "@/components/mobile/OperatorShell";

interface BoxData {
  id: string;
  reference: string;
  box_id: string;
  box_number: string;
  weight: string;
  site: string;
  staging_location: string;
  store_name: string;
  address: string;
  city: string;
  province: string;
  loading_status: string;
  putaway_at: string;
  putaway_by_name: string;
}

interface SiteData {
  id: number;
  site: string;
  store_name: string;
  address: string;
  city: string;
  province: string;
}

const STAGING_LOCATIONS = Array.from({ length: 8 }, (_, i) => `STG-OUT-${String(i + 1).padStart(2, "0")}`);

export default function B2BPutawayPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const siteInputRef = useRef<HTMLInputElement>(null);
  const locationSelectRef = useRef<HTMLSelectElement>(null);
  const [loading, setLoading] = useState(false);
  const [operatorId, setOperatorId] = useState("");

  const [reference, setReference] = useState("");
  const [boxId, setBoxId] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [stagingLocation, setStagingLocation] = useState("");

  const [sites, setSites] = useState<SiteData[]>([]);
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const totalBox = boxes.length;
  const [isNewReference, setIsNewReference] = useState(true);

  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [step, setStep] = useState<"reference" | "box">("reference");

  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BoxData>>({});

  const matchedStore = sites.find(
    (s) => s.site.trim().toLowerCase() === selectedSite.trim().toLowerCase()
  );

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const { user } = await res.json();
          setOperatorId(user.id);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await fetch("/api/b2b/master/store");
        if (res.ok) {
          const data = await res.json();
          setSites(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching sites:", error);
      }
    };
    fetchSites();
  }, []);

  const handleScanReference = async () => {
    const cleanRef = reference.trim();
    if (!cleanRef) {
      showToast.error("Scan reference terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/b2b/putaway/scan-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: cleanRef }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        const data = result.data;
        setIsNewReference(data.is_new);
        setBoxes(data.boxes || []);

        if (data.is_new) {
          setStatusMsg({ text: `🆕 Reference baru: ${cleanRef}`, type: "success" });
        } else {
          setStatusMsg({ text: `📦 Reference: ${cleanRef} (${(data.boxes || []).length} box)`, type: "info" });
        }

        setStep("box");
        playAcceptedSound();
        setTimeout(() => siteInputRef.current?.focus(), 200);
      } else {
        showToast.error(result.message || "Gagal scan reference");
        playRejectedSound();
      }
    } catch (error) {
      console.error("Error scanning reference:", error);
      showToast.error("Error scanning reference");
      playRejectedSound();
    } finally {
      setLoading(false);
    }
  };

  const handleScanBox = async (locationOverride?: string) => {
    if (loading) return;

    const cleanBoxId = boxId.trim();
    const locationToUse = locationOverride ?? stagingLocation;

    if (!cleanBoxId) {
      showToast.error("Scan box ID terlebih dahulu");
      return;
    }

    if (cleanBoxId.length <= 14) {
      showToast.error(`❌ Box ID terlalu pendek (${cleanBoxId.length} karakter). Minimal 15 karakter.`);
      playRejectedSound();
      inputRef.current?.focus();
      return;
    }

    if (!selectedSite.trim()) {
      showToast.error("Scan site terlebih dahulu");
      siteInputRef.current?.focus();
      return;
    }

    if (!matchedStore) {
      showToast.error(`❌ Site "${selectedSite.trim()}" tidak terdaftar di master store. Update dulu di master store.`);
      playRejectedSound();
      siteInputRef.current?.focus();
      return;
    }

    if (!locationToUse) {
      showToast.error("Pilih location terlebih dahulu");
      locationSelectRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/b2b/putaway/scan-box", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: reference,
          box_id: cleanBoxId,
          site: selectedSite.trim(),
          staging_location: locationToUse,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        playAcceptedSound();
        showToast.success(result.message);
        setBoxes(prev => [...prev, result.data]);
        setBoxId("");
        setStatusMsg({ text: `✅ Box ${cleanBoxId} berhasil discan`, type: "success" });
        setTimeout(() => inputRef.current?.focus(), 200);
      } else {
        playRejectedSound();
        showToast.error(result.message || "Gagal scan box");
      }
    } catch (error) {
      console.error("Error scanning box:", error);
      showToast.error("Error scanning box");
      playRejectedSound();
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (box: BoxData) => {
    setEditingBoxId(box.id);
    setEditForm({
      store_name: box.store_name || "",
      address: box.address || "",
      city: box.city || "",
      province: box.province || "",
      site: box.site || "",
      staging_location: box.staging_location || "",
      weight: box.weight || "",
    });
  };

  const cancelEdit = () => {
    setEditingBoxId(null);
    setEditForm({});
  };

  const saveEdit = async (boxId: string) => {
    try {
      const res = await fetch(`/api/b2b/putaway/box/${boxId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          showToast.success("✅ Data box berhasil diupdate");
          setEditingBoxId(null);
          setEditForm({});

          const refreshRes = await fetch(`/api/b2b/putaway/list/${encodeURIComponent(reference)}`, {
            cache: "no-store",
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setBoxes(data.data.boxes || []);
          }
        } else {
          showToast.error(result.message || "Gagal update box");
        }
      } else {
        const error = await res.json();
        showToast.error(error.message || "Gagal update box");
      }
    } catch (error) {
      console.error("Error saving edit:", error);
      showToast.error("Error updating box");
    }
  };

  // 🔥 Tombol back: langsung ke menu awal
  const handleBack = () => {
    router.push("/menu");
  };

  const handleReset = () => {
    setStep("reference");
    setReference("");
    setBoxId("");
    setSelectedSite("");
    setStagingLocation("");
    setBoxes([]);
    setStatusMsg({ text: "", type: "" });
    setLoading(false);
    setEditingBoxId(null);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  // =============================================
  // RENDER: Scan Reference
  // =============================================
  if (step === "reference") {
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
                  B2B Putaway
                </p>
                <p className="font-extrabold text-lg text-slate-900 leading-tight">
                  Scan Reference
                </p>
              </div>
            </div>

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

            {/* Scan Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Scan className="w-4 h-4" />
                Scan Reference / PO
              </div>

              <input
                ref={inputRef}
                type="text"
                autoFocus
                disabled={loading}
                placeholder="Scan reference..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleScanReference()}
                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-mono text-lg font-bold focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all disabled:opacity-50 text-center"
              />

              <button
                onClick={handleScanReference}
                disabled={loading}
                className="w-full py-4 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white font-extrabold rounded-xl active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#0B2B4A]/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5" />
                    Cek Reference
                  </>
                )}
              </button>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-800 mb-1">Informasi</p>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Scan reference / PO untuk memulai putaway.
                    Reference akan digunakan sebagai group untuk box-box yang masuk.
                  </p>
                </div>
              </div>
            </div>

            <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
              nusaena v1 · B2B PUTAWAY
            </footer>
          </div>
        </div>
      </OperatorShell>
    );
  }

  // =============================================
  // RENDER: Scan Box
  // =============================================
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
            <div className="flex-1">
              <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-widest">
                B2B Putaway
              </p>
              <p className="font-extrabold text-lg text-slate-900 leading-tight">
                Scan Box
              </p>
            </div>
          </div>

          {/* Reference Info Card */}
          <div className="bg-gradient-to-br from-[#0B2B4A] to-[#1a3d5c] rounded-2xl p-4 shadow-lg">
            <div className="flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                  Reference
                </p>
                <p className="font-mono font-bold text-white text-base truncate">{reference}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                  Total Box
                </p>
                <p className="text-3xl font-extrabold text-white leading-none">{totalBox}</p>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {statusMsg.text && (
            <div className={`p-3 rounded-2xl border-2 text-sm font-bold flex items-center gap-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : statusMsg.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-300"
                : "bg-blue-50 text-blue-800 border-blue-300"
            }`}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {statusMsg.text}
            </div>
          )}

          {/* Scanner Form */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">

            {/* Step 1: Site */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-blue-600">1</span>
                </div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Scan Site
                </label>
              </div>
              <input
                ref={siteInputRef}
                type="text"
                autoFocus
                disabled={loading}
                list="site-datalist"
                placeholder="Scan / ketik kode site..."
                value={selectedSite}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 8);
                  setSelectedSite(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && selectedSite.trim()) {
                    e.preventDefault();
                    if (!matchedStore) {
                      showToast.error(`❌ Site "${selectedSite.trim()}" tidak terdaftar. Update dulu di master store.`);
                      playRejectedSound();
                      return;
                    }
                    if (stagingLocation) {
                      inputRef.current?.focus();
                    } else {
                      locationSelectRef.current?.focus();
                    }
                  }
                }}
                maxLength={8}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-mono text-base font-bold focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all disabled:opacity-50 uppercase"
              />
              <datalist id="site-datalist">
                {sites.map((s) => (
                  <option key={s.id} value={s.site} />
                ))}
              </datalist>

              {/* Preview matched store */}
              {selectedSite.trim() && (
                matchedStore ? (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-800">{matchedStore.store_name}</p>
                        <p className="text-[10px] text-emerald-600 leading-relaxed">
                          {[matchedStore.address, matchedStore.city, matchedStore.province].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-amber-700 leading-relaxed">
                        Site "{selectedSite.trim()}" tidak ditemukan di master store — hubungi admin untuk update master store
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Step 2: Location */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-blue-600">2</span>
                </div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Pilih Location
                </label>
              </div>
              <select
                ref={locationSelectRef}
                value={stagingLocation}
                disabled={loading}
                onChange={(e) => {
                  setStagingLocation(e.target.value);
                  if (e.target.value) {
                    inputRef.current?.focus();
                  }
                }}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all"
              >
                <option value="">-- Pilih Location --</option>
                {STAGING_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Step 3: Box ID */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-blue-600">3</span>
                </div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Scan Box ID
                </label>
              </div>
              <input
                ref={inputRef}
                type="text"
                disabled={loading}
                placeholder="Scan box ID..."
                value={boxId}
                onChange={(e) => setBoxId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && boxId.trim() && !loading) {
                    e.preventDefault();

                    const cleanBoxId = boxId.trim();

                    if (cleanBoxId.length <= 14) {
                      showToast.error(`❌ Box ID terlalu pendek (${cleanBoxId.length} karakter). Minimal 15 karakter.`);
                      playRejectedSound();
                      return;
                    }

                    if (!selectedSite.trim()) {
                      showToast.error("Scan site terlebih dahulu");
                      siteInputRef.current?.focus();
                      return;
                    }

                    if (!matchedStore) {
                      showToast.error(`❌ Site "${selectedSite.trim()}" tidak terdaftar. Update dulu di master store.`);
                      playRejectedSound();
                      siteInputRef.current?.focus();
                      return;
                    }

                    if (!stagingLocation) {
                      showToast.error("Pilih location terlebih dahulu");
                      locationSelectRef.current?.focus();
                      return;
                    }

                    handleScanBox();
                  }
                }}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-mono text-base font-bold focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all disabled:opacity-50"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={() => handleScanBox()}
              disabled={
                loading ||
                !selectedSite.trim() ||
                !boxId.trim() ||
                boxId.trim().length <= 14 ||
                !stagingLocation ||
                !matchedStore
              }
              className="w-full py-4 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white font-extrabold rounded-xl active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#0B2B4A]/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  Simpan Box
                </>
              )}
            </button>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-full py-3 text-sm text-slate-500 hover:text-slate-700 font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset & Scan Reference Baru
            </button>
          </div>

          {/* Box List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">
                📋 Box List ({boxes.length})
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {boxes.length === 0 ? (
                <div className="p-6 bg-white border-2 border-dashed border-slate-300 rounded-2xl text-center text-slate-400 text-sm">
                  Belum ada box discan
                </div>
              ) : (
                boxes.map((box) => {
                  const isEditing = editingBoxId === box.id;

                  return (
                    <div
                      key={box.id}
                      className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm"
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sm text-slate-800 truncate">
                              {box.box_id}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => saveEdit(box.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold uppercase">Store</label>
                              <input
                                type="text"
                                value={editForm.store_name || ""}
                                onChange={(e) => setEditForm({ ...editForm, store_name: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold uppercase">Weight (kg)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.weight || ""}
                                onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[9px] text-slate-400 font-bold uppercase">Address</label>
                              <input
                                type="text"
                                value={editForm.address || ""}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold uppercase">City</label>
                              <input
                                type="text"
                                value={editForm.city || ""}
                                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold uppercase">Province</label>
                              <input
                                type="text"
                                value={editForm.province || ""}
                                onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold uppercase">Site</label>
                              <input
                                type="text"
                                value={editForm.site || ""}
                                onChange={(e) => setEditForm({ ...editForm, site: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold uppercase">Staging</label>
                              <select
                                value={editForm.staging_location || ""}
                                onChange={(e) => setEditForm({ ...editForm, staging_location: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                              >
                                <option value="">-- Pilih --</option>
                                {STAGING_LOCATIONS.map((loc) => (
                                  <option key={loc} value={loc}>{loc}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                </div>
                                <p className="font-mono text-sm font-bold text-slate-800 truncate">
                                  {box.box_number}
                                </p>
                              </div>
                              <p className="text-xs text-slate-500 ml-8">
                                {box.weight ? `${box.weight}kg` : '-'} · {box.site}
                                {box.staging_location && ` · ${box.staging_location}`}
                              </p>
                              {(box.store_name || box.address || box.city || box.province) && (
                                <div className="mt-1 text-[10px] text-slate-400 ml-8 leading-relaxed">
                                  {box.store_name && <span>{box.store_name}</span>}
                                  {box.address && <span> · {box.address}</span>}
                                  {box.city && <span> · {box.city}</span>}
                                  {box.province && <span> · {box.province}</span>}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => startEdit(box)}
                              className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold pt-2">
            nusaena v1 · B2B PUTAWAY
          </footer>
        </div>
      </div>
    </OperatorShell>
  );
}