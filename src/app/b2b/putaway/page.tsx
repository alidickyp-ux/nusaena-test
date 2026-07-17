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

export default function B2BPutawayPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
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
        setTimeout(() => inputRef.current?.focus(), 200);
      } else {
        showToast.error(result.message || "Gagal scan reference");
        playRejectedSound();
      }
    } catch (error) {
      showToast.error("Error scanning reference");
      playRejectedSound();
    } finally {
      setLoading(false);
    }
  };

  // Handle scan box
  const handleScanBox = async () => {
    const cleanBoxId = boxId.trim();
    if (!cleanBoxId) {
      showToast.error("Scan box ID terlebih dahulu");
      return;
    }

    if (!selectedSite) {
      showToast.error("Pilih site terlebih dahulu");
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
          site: selectedSite,
          staging_location: stagingLocation,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        playAcceptedSound();
        showToast.success(result.message);
        
        // Add to list
        setBoxes(prev => [...prev, result.data]);
        setTotalBox(result.total_box);
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
      showToast.error("Error scanning box");
      playRejectedSound();
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "box") {
      setStep("reference");
      setBoxes([]);
      setReference("");
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

          {/* Status */}
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

          {/* Scanner */}
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

          {/* Info */}
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <p className="text-[10px] text-stone-400 text-center">
              💡 Scan reference / PO untuk memulai putaway.
              <br />
              Reference akan digunakan sebagai group untuk box-box yang masuk.
            </p>
          </div>

          <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
            COOL SYSTEM V3 · B2B PUTAWAY
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

        {/* Status */}
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
              1. Pilih Site
            </label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Pilih Site --</option>
              {sites.map((s) => (
                <option key={s.id} value={s.site}>
                  {s.site} - {s.store_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest">
              2. Staging Location
            </label>
            <input
              type="text"
              placeholder="Contoh: A-01-03"
              value={stagingLocation}
              onChange={(e) => setStagingLocation(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-blue-500 uppercase"
            />
          </div>

          <div>
            <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest">
              3. Scan Box ID
            </label>
            <input
              ref={inputRef}
              type="text"
              autoFocus
              disabled={loading}
              placeholder="Scan box ID..."
              value={boxId}
              onChange={(e) => setBoxId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleScanBox()}
              className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-mono text-lg font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <button
            onClick={handleScanBox}
            disabled={loading || !selectedSite}
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

        {/* Box List */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <p className="text-stone-500 text-xs uppercase font-bold tracking-widest">
              📋 Box List ({boxes.length})
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1.5">
            {boxes.length === 0 ? (
              <div className="p-4 bg-white border-2 border-dashed border-stone-300 rounded-xl text-center text-stone-400 text-sm">
                Belum ada box discan
              </div>
            ) : (
              boxes.map((box) => (
                <div
                  key={box.id}
                  className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between"
                >
                  <div>
                    <p className="font-mono text-sm font-bold text-stone-800">
                      {box.box_number}
                    </p>
                    <p className="text-xs text-stone-500">
                      {box.weight ? `${box.weight}kg` : '-'} · {box.site}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      ✅ Saved
                    </span>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {new Date(box.putaway_at).toLocaleTimeString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
          COOL SYSTEM V3 · B2B PUTAWAY
        </footer>
      </div>
    </OperatorShell>
  );
}