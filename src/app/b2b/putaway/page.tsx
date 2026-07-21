"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";
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

// 🔥 8 lokasi staging tetap
const STAGING_LOCATIONS = Array.from({ length: 8 }, (_, i) => `STG-OUT-${String(i + 1).padStart(2, "0")}`);

export default function B2BPutawayPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const siteInputRef = useRef<HTMLInputElement>(null);
  const locationSelectRef = useRef<HTMLSelectElement>(null);
  const [loading, setLoading] = useState(false);
  const [operatorId, setOperatorId] = useState("");
  
  // State scan
  const [reference, setReference] = useState("");
  const [boxId, setBoxId] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [stagingLocation, setStagingLocation] = useState("");
  
  // Data
  const [sites, setSites] = useState<SiteData[]>([]);
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [totalBox, setTotalBox] = useState(0);
  const [isNewReference, setIsNewReference] = useState(true);
  
  // Status
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [step, setStep] = useState<"reference" | "box">("reference");
  
  // 🔥 State untuk edit
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BoxData>>({});

  // 🔥 Cocokkan site yang sedang diketik/discan ke master store (client-side,
  // case-insensitive) supaya nama toko langsung muncul tanpa perlu simpan dulu
  const matchedStore = sites.find(
    (s) => s.site.trim().toLowerCase() === selectedSite.trim().toLowerCase()
  );

  // Fetch user
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

  // Fetch sites
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

  // Handle scan reference
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
        setTotalBox(data.total_box || 0);
        
        if (data.is_new) {
          setStatusMsg({ text: `🆕 Reference baru: ${cleanRef}`, type: "success" });
        } else {
          setStatusMsg({ text: `📦 Reference: ${cleanRef} (${data.total_box} box)`, type: "info" });
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

  // Handle scan box
  // 🔥 locationOverride: dipakai saat auto-submit begitu location dipilih dari
  // dropdown — di titik itu state `stagingLocation` belum ter-update (closure
  // masih lihat nilai lama), jadi nilai yang baru dipilih dikirim langsung.
  const handleScanBox = async (locationOverride?: string) => {
    const cleanBoxId = boxId.trim();
    const locationToUse = locationOverride ?? stagingLocation;

    if (!cleanBoxId) {
      showToast.error("Scan box ID terlebih dahulu");
      return;
    }

    if (!selectedSite.trim()) {
      showToast.error("Scan site terlebih dahulu");
      return;
    }

    if (!locationToUse) {
      showToast.error("Pilih location terlebih dahulu");
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
        
        // Add to list with full data
        setBoxes(prev => [...prev, result.data]);
        setTotalBox(result.total_box);
        // 🔥 Reset box id & location untuk box berikutnya, site tetap
        // (biasanya beberapa box berturut-turut menuju site yang sama)
        setBoxId("");
        setStagingLocation("");
        
        setStatusMsg({ 
          text: `✅ Box ${cleanBoxId} berhasil discan (${result.total_box} total)`, 
          type: "success" 
        });
        
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

  // 🔥 Start edit box
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

  // 🔥 Cancel edit
  const cancelEdit = () => {
    setEditingBoxId(null);
    setEditForm({});
  };

  // 🔥 Save edit box
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
          
          // Refresh box list
          const refreshRes = await fetch(`/api/b2b/putaway/list/${encodeURIComponent(reference)}`, {
            cache: "no-store",
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setBoxes(data.data.boxes || []);
            setTotalBox(data.data.total_box || 0);
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

  const handleBack = () => {
    if (step === "box") {
      setStep("reference");
      setBoxes([]);
      setReference("");
      setBoxId("");
      setSelectedSite("");
      setStagingLocation("");
      setStatusMsg({ text: "", type: "" });
    } else {
      router.push("/b2b");
    }
  };

  const handleReset = () => {
    setStep("reference");
    setReference("");
    setBoxId("");
    setSelectedSite("");
    setStagingLocation("");
    setBoxes([]);
    setTotalBox(0);
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
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
                B2B Putaway
              </p>
              <p className="font-extrabold text-lg text-stone-900">Scan Reference</p>
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
              Scan Reference / PO
            </label>
            <input
              ref={inputRef}
              type="text"
              autoFocus
              disabled={loading}
              placeholder="Scan reference..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleScanReference()}
              className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-mono text-lg font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleScanReference}
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? "⏳ Memproses..." : "🔍 Cek Reference"}
            </button>
          </div>

          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <p className="text-[10px] text-stone-400 text-center">
              💡 Scan reference / PO untuk memulai putaway.
              <br />
              Reference akan digunakan sebagai group untuk box-box yang masuk.
            </p>
          </div>

          <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
            nusaena v1 · B2B PUTAWAY
          </footer>
        </div>
      </OperatorShell>
    );
  }

  // =============================================
  // RENDER: Scan Box
  // =============================================
  return (
    <OperatorShell>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
              B2B Putaway
            </p>
            <p className="font-extrabold text-lg text-stone-900">Scan Box</p>
          </div>
          <button
            onClick={handleBack}
            className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
          >
            ← Kembali
          </button>
        </div>

        {/* Reference Info */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-blue-600 font-medium">Reference</p>
              <p className="font-mono font-bold text-stone-900">{reference}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600 font-medium">Total Box</p>
              <p className="text-xl font-bold text-blue-700">{totalBox}</p>
            </div>
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

        {/* Scanner Form */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
          <div>
            <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest">
              1. Scan Site
            </label>
            <input
              ref={siteInputRef}
              type="text"
              autoFocus
              disabled={loading}
              list="site-datalist"
              placeholder="Scan / ketik kode site..."
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && selectedSite.trim()) {
                  e.preventDefault();
                  inputRef.current?.focus();
                }
              }}
              className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-mono text-lg font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50 uppercase"
            />
            <datalist id="site-datalist">
              {sites.map((s) => (
                <option key={s.id} value={s.site} />
              ))}
            </datalist>

            {/* 🔥 Preview info toko dari master_store, real-time saat site diketik/discan */}
            {selectedSite.trim() && (
              matchedStore ? (
                <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs font-bold text-emerald-800">{matchedStore.store_name}</p>
                  <p className="text-[10px] text-emerald-600">
                    {[matchedStore.address, matchedStore.city, matchedStore.province].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ) : (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-bold text-amber-700">
                    ⚠️ Site "{selectedSite.trim()}" tidak ditemukan di master store — data toko akan dikosongkan
                  </p>
                </div>
              )
            )}
          </div>

          <div>
            <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest">
              2. Scan Box ID
            </label>
            <input
              ref={inputRef}
              type="text"
              disabled={loading}
              placeholder="Scan box ID..."
              value={boxId}
              onChange={(e) => setBoxId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && boxId.trim()) {
                  e.preventDefault();
                  if (!selectedSite.trim()) {
                    showToast.error("Scan site terlebih dahulu");
                    siteInputRef.current?.focus();
                    return;
                  }
                  // 🔥 Box id belum langsung disimpan — lanjut ke pilih location dulu
                  locationSelectRef.current?.focus();
                }
              }}
              className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-mono text-lg font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest">
              3. Pilih Location
            </label>
            <select
              ref={locationSelectRef}
              value={stagingLocation}
              disabled={loading}
              onChange={(e) => {
                const value = e.target.value;
                setStagingLocation(value);
                if (value && boxId.trim() && selectedSite.trim()) {
                  // 🔥 Auto simpan begitu location dipilih — ini langkah terakhir
                  handleScanBox(value);
                }
              }}
              className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Pilih Location --</option>
              {STAGING_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleScanBox()}
            disabled={loading || !selectedSite.trim() || !boxId.trim() || !stagingLocation}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "⏳ Menyimpan..." : "📦 Simpan Box"}
          </button>

          <button
            onClick={handleReset}
            className="w-full py-2 text-sm text-stone-500 hover:text-stone-700 font-medium"
          >
            🔄 Reset & Scan Reference Baru
          </button>
        </div>

        {/* 🔥 Box List with Edit */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <p className="text-stone-500 text-xs uppercase font-bold tracking-widest">
              📋 Box List ({boxes.length})
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {boxes.length === 0 ? (
              <div className="p-4 bg-white border-2 border-dashed border-stone-300 rounded-xl text-center text-stone-400 text-sm">
                Belum ada box discan
              </div>
            ) : (
              boxes.map((box) => {
                const isEditing = editingBoxId === box.id;
                
                return (
                  <div
                    key={box.id}
                    className="bg-white p-3 rounded-xl border border-stone-200"
                  >
                    {isEditing ? (
                      // 🔥 Edit Mode
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm text-stone-800 truncate">
                            {box.box_id}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-stone-400 hover:bg-stone-100 rounded-lg"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <button
                              onClick={() => saveEdit(box.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[9px] text-stone-400 font-bold uppercase">Store</label>
                            <input
                              type="text"
                              value={editForm.store_name || ""}
                              onChange={(e) => setEditForm({ ...editForm, store_name: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-stone-400 font-bold uppercase">Weight (kg)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.weight || ""}
                              onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] text-stone-400 font-bold uppercase">Address</label>
                            <input
                              type="text"
                              value={editForm.address || ""}
                              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-stone-400 font-bold uppercase">City</label>
                            <input
                              type="text"
                              value={editForm.city || ""}
                              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-stone-400 font-bold uppercase">Province</label>
                            <input
                              type="text"
                              value={editForm.province || ""}
                              onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-stone-400 font-bold uppercase">Site</label>
                            <input
                              type="text"
                              value={editForm.site || ""}
                              onChange={(e) => setEditForm({ ...editForm, site: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-stone-400 font-bold uppercase">Staging</label>
                            <select
                              value={editForm.staging_location || ""}
                              onChange={(e) => setEditForm({ ...editForm, staging_location: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      // 🔥 View Mode
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-mono text-sm font-bold text-stone-800">
                              {box.box_number}
                            </p>
                            <p className="text-xs text-stone-500">
                              {box.weight ? `${box.weight}kg` : '-'} · {box.site}
                              {box.staging_location && ` · ${box.staging_location}`}
                            </p>
                            {/* 🔥 Tampilkan alamat */}
                            {(box.store_name || box.address || box.city || box.province) && (
                              <div className="mt-1 text-[10px] text-stone-400">
                                {box.store_name && <span>{box.store_name}</span>}
                                {box.address && <span> · {box.address}</span>}
                                {box.city && <span> · {box.city}</span>}
                                {box.province && <span> · {box.province}</span>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => startEdit(box)}
                              className="p-1.5 text-stone-400 hover:bg-stone-100 rounded-lg"
                              title="Edit alamat"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              ✅
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
          nusaena v1 · B2B PUTAWAY
        </footer>
      </div>
    </OperatorShell>
  );
}