'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Package,
  MapPin,
  Barcode,
  Trash2,
  ChevronRight
} from 'lucide-react';
import showToast from '@/lib/toast';

interface ExpectedLine {
  soLineId: string;
  artikel: string;
  description: string | null;
  location: string;
  qtySo: number;
  qtyPicked: number;
  qtyRemaining: number;
}

interface SavedLine {
  artikel: string;
  location: string;
  qty: number;
  flagType: string | null;
}

const FLAG_OPTIONS = [
  { value: 'DAMAGED', label: 'Rusak' },
  { value: 'SHORT', label: 'Stok kurang' },
  { value: 'FOUND', label: 'Ditemukan / kelebihan' },
];

export default function PickingPage() {
  const { soId } = useParams<{ soId: string }>();
  const router = useRouter();
  const [pickingSessionId, setPickingSessionId] = useState<string>('');

  // Lokasi
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loadingLocations, setLoadingLocations] = useState(true);

  // Expected lines
  const [expectedLines, setExpectedLines] = useState<ExpectedLine[]>([]);
  const [locationError, setLocationError] = useState('');
  const [loadingLines, setLoadingLines] = useState(false);

  // Scan artikel
  const [artikelInput, setArtikelInput] = useState('');
  const [selectedLine, setSelectedLine] = useState<ExpectedLine | null>(null);
  const [qty, setQty] = useState<string>('');
  const [flagType, setFlagType] = useState<string | null>(null);
  const [flagNote, setFlagNote] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savedLines, setSavedLines] = useState<SavedLine[]>([]);
  const [saving, setSaving] = useState(false);

  const artikelInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // 1. Ambil daftar lokasi untuk SO ini
  useEffect(() => {
    async function fetchLocations() {
      setLoadingLocations(true);
      try {
        const res = await fetch(`/api/b2b/picking/so/${soId}/locations`);
        const data = await res.json();
        setLocations(data.locations || []);
        if (data.locations?.length === 1) {
          setSelectedLocation(data.locations[0]);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        showToast.error('Gagal memuat lokasi');
      } finally {
        setLoadingLocations(false);
      }
    }
    fetchLocations();
  }, [soId]);

  // 2. Buat picking session
  useEffect(() => {
    async function createSession() {
      try {
        const res = await fetch('/api/b2b/picking/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ soId }),
        });
        const data = await res.json();
        if (res.ok) {
          setPickingSessionId(data.sessionId);
        } else {
          showToast.error(data.error || 'Gagal membuat session');
        }
      } catch (error) {
        console.error('Error creating picking session:', error);
        showToast.error('Error creating session');
      }
    }
    if (soId) createSession();
  }, [soId]);

  // 3. Saat lokasi berubah, fetch expected lines
  useEffect(() => {
    if (!selectedLocation) {
      setExpectedLines([]);
      return;
    }

    async function fetchLines() {
      setLocationError('');
      setLoadingLines(true);
      try {
        const res = await fetch(
          `/api/b2b/picking/location?soId=${soId}&location=${encodeURIComponent(
            selectedLocation
          )}`
        );
        const data = await res.json();
        if (!res.ok) {
          setLocationError(data.error || 'Gagal memuat data lokasi');
          setExpectedLines([]);
        } else {
          setExpectedLines(data.lines || []);
          // Reset form
          setArtikelInput('');
          setSelectedLine(null);
          setQty('');
          setFlagType(null);
          setFlagNote('');
          setSaveError('');
          setTimeout(() => artikelInputRef.current?.focus(), 100);
        }
      } catch (error) {
        setLocationError('Error fetching lines');
      } finally {
        setLoadingLines(false);
      }
    }
    fetchLines();
  }, [selectedLocation, soId]);

  // Handle scan artikel (enter otomatis)
  function handleScanArtikel(e: React.FormEvent) {
    e.preventDefault();
    if (!artikelInput.trim()) return;
    
    const match = expectedLines.find((l) => l.artikel === artikelInput);
    setSelectedLine(match ?? null);
    if (!match) {
      setFlagType('FOUND');
    } else {
      setFlagType(null);
    }
    setQty('');
    setFlagNote('');
    setSaveError('');
    setTimeout(() => qtyInputRef.current?.focus(), 100);
  }

  // Handle save
  async function handleSave() {
    setSaveError('');
    const qtyNum = Number(qty);

    if (!qtyNum || qtyNum <= 0) {
      setSaveError('Isi qty terlebih dahulu');
      return;
    }

    if ((flagType === 'DAMAGED' || flagType === 'SHORT') && !flagNote.trim()) {
      setSaveError('Isi catatan untuk flag yang dipilih');
      return;
    }

    if (!selectedLine && !flagType) {
      setSaveError('Artikel tidak dikenali — pilih flag terlebih dahulu');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/b2b/picking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickingSessionId,
          soLineId: selectedLine?.soLineId,
          artikel: artikelInput,
          location: selectedLocation,
          qtyPicked: qtyNum,
          flagType,
          flagNote: flagNote || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error ?? 'Gagal menyimpan');
        return;
      }

      // Sukses
      showToast.success(`✅ ${artikelInput} berhasil dipick (${qtyNum} pcs)`);
      
      setSavedLines((prev) => [
        { artikel: artikelInput, location: selectedLocation, qty: qtyNum, flagType },
        ...prev,
      ]);

      // Reset form
      setArtikelInput('');
      setSelectedLine(null);
      setQty('');
      setFlagType(null);
      setFlagNote('');
      setSaveError('');
      artikelInputRef.current?.focus();

      // Refresh expected lines
      const refreshRes = await fetch(
        `/api/b2b/picking/location?soId=${soId}&location=${encodeURIComponent(
          selectedLocation
        )}`
      );
      const refreshData = await refreshRes.json();
      if (refreshRes.ok) {
        setExpectedLines(refreshData.lines || []);
        // Jika semua selesai, beri tahu
        const allDone = refreshData.lines.every((l: ExpectedLine) => l.qtyRemaining === 0);
        if (allDone) {
          showToast.success('🎉 Semua artikel di lokasi ini selesai!');
          // Hapus lokasi ini dari daftar (filter di bawah)
        }
      }
    } catch (error) {
      setSaveError('Error saving picking');
      showToast.error('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  // Hitung progress seluruh SO (dari semua lokasi)
  // Kita perlu total semua line di semua lokasi, tapi kita hanya punya data per lokasi.
  // Untuk progress global, kita ambil dari expectedLines saat ini (hanya satu lokasi).
  // Alternatif: fetch dari API terpisah. Untuk sementara, kita hitung dari semua lokasi yang sudah pernah di-load.
  // Tapi karena kita hanya punya data satu lokasi, progress global akan dihitung dari total di semua lokasi yang sudah diketahui.
  // Solusi: tambahkan state global untuk akumulasi.
  // Saya akan buat state progress global.
  const [globalTotalSo, setGlobalTotalSo] = useState(0);
  const [globalTotalPicked, setGlobalTotalPicked] = useState(0);

  // Ketika expectedLines berubah, update global progress (ini hanya per lokasi, untuk global perlu aggregasi)
  // Untuk sementara, kita gunakan data dari semua lokasi yang sudah di-fetch.
  // Saya tambahkan efek untuk update global dengan menjumlahkan dari semua lokasi yang pernah di-fetch.
  // Lebih baik: buat endpoint /api/b2b/picking/so/[soId]/progress untuk total semua lokasi.
  // Tapi untuk sederhana, kita akumulasi dari expectedLines yang sedang aktif.
  // Saya akan tambahkan state untuk menyimpan semua lines dari semua lokasi.
  const [allLines, setAllLines] = useState<ExpectedLine[]>([]);

  // Saat expectedLines berubah, update allLines (merge berdasarkan soLineId)
  useEffect(() => {
    if (expectedLines.length === 0) return;
    setAllLines((prev) => {
      const map = new Map<string, ExpectedLine>();
      // Tambahkan yang lama
      prev.forEach((l) => map.set(l.soLineId, l));
      // Update dengan yang baru
      expectedLines.forEach((l) => map.set(l.soLineId, l));
      return Array.from(map.values());
    });
  }, [expectedLines]);

  // Hitung global progress dari allLines
  useEffect(() => {
    const totalSo = allLines.reduce((sum, l) => sum + l.qtySo, 0);
    const totalPicked = allLines.reduce((sum, l) => sum + l.qtyPicked, 0);
    setGlobalTotalSo(totalSo);
    setGlobalTotalPicked(totalPicked);
  }, [allLines]);

  // Filter lokasi yang masih ada sisa (qtyRemaining > 0)
  const activeLocations = locations.filter((loc) => {
    // Cari di allLines apakah ada line dengan lokasi ini yang masih punya sisa
    const linesInLoc = allLines.filter((l) => l.location === loc);
    const hasRemaining = linesInLoc.some((l) => l.qtyRemaining > 0);
    return hasRemaining || linesInLoc.length === 0; // jika belum ada data, tetap tampilkan
  });

  // Progress persentase
  const progress = globalTotalSo > 0 ? Math.round((globalTotalPicked / globalTotalSo) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/b2b/picking')}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <div>
              <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">
                Picking
              </p>
              <p className="font-extrabold text-lg text-stone-900 leading-tight">
                SO #{soId.slice(0, 8)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-[#0B2B4A] text-white px-3 py-1 rounded-full font-bold">
              {progress}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
          <div className="flex justify-between text-xs text-stone-500 mb-1">
            <span>Progress SO</span>
            <span>{globalTotalPicked} / {globalTotalSo} pcs</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#0B2B4A] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Pilih Lokasi */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
            <MapPin className="w-4 h-4" />
            Pilih Lokasi
          </div>
          {loadingLocations ? (
            <div className="flex items-center gap-2 text-sm text-stone-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat lokasi...
            </div>
          ) : (
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] bg-white"
            >
              <option value="">-- Pilih lokasi --</option>
              {activeLocations.map((loc) => {
                // Hitung sisa di lokasi ini
                const linesInLoc = allLines.filter((l) => l.location === loc);
                const totalRemaining = linesInLoc.reduce((sum, l) => sum + l.qtyRemaining, 0);
                const isDone = totalRemaining === 0 && linesInLoc.length > 0;
                return (
                  <option key={loc} value={loc} disabled={isDone}>
                    {loc} {isDone ? '✅' : ` (sisa ${totalRemaining})`}
                  </option>
                );
              })}
            </select>
          )}
          {locationError && (
            <p className="text-xs text-red-500 mt-2">{locationError}</p>
          )}
        </div>

        {/* Scan Artikel + Form (hanya muncul jika ada expected lines) */}
        {selectedLocation && expectedLines.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <form onSubmit={handleScanArtikel} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider">
                <Barcode className="w-4 h-4" />
                Scan Artikel
              </div>
              <input
                ref={artikelInputRef}
                value={artikelInput}
                onChange={(e) => setArtikelInput(e.target.value)}
                placeholder="Scan barcode artikel..."
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                autoFocus
              />
              <p className="text-[10px] text-stone-400">
                Diharapkan: {expectedLines.map((l) => l.artikel).join(', ')}
              </p>
            </form>

            {/* Form Qty & Flag */}
            {(selectedLine || flagType) && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    Qty Pick
                  </label>
                  <input
                    ref={qtyInputRef}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    inputMode="numeric"
                    placeholder="0"
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-center font-medium text-lg focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                  />
                  {selectedLine && (
                    <p className="text-xs text-stone-400 mt-1">
                      Sisa SO: {selectedLine.qtyRemaining} pcs
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    Flag {!selectedLine && <span className="text-red-500">(wajib)</span>}
                  </label>
                  <select
                    value={flagType ?? ''}
                    onChange={(e) => setFlagType(e.target.value || null)}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4A] bg-white"
                  >
                    <option value="">Tidak ada</option>
                    {FLAG_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  {(flagType === 'DAMAGED' || flagType === 'SHORT') && (
                    <input
                      value={flagNote}
                      onChange={(e) => setFlagNote(e.target.value)}
                      placeholder="Catatan flag (wajib)"
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                    />
                  )}
                  {flagType === 'FOUND' && (
                    <input
                      value={flagNote}
                      onChange={(e) => setFlagNote(e.target.value)}
                      placeholder="Catatan (opsional)"
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-[#0B2B4A]"
                    />
                  )}
                </div>

                {saveError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    {saveError}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Box List */}
        {savedLines.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
              <span>Box List ({savedLines.length})</span>
              <span className="text-stone-400">{savedLines.reduce((sum, l) => sum + l.qty, 0)} pcs</span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {savedLines.map((l, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 pb-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-stone-800">{l.artikel}</span>
                    <span className="text-xs text-stone-400">{l.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-800">{l.qty} pcs</span>
                    {l.flagType && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        l.flagType === 'DAMAGED' ? 'bg-red-100 text-red-700' :
                        l.flagType === 'SHORT' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {l.flagType.toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
          nusaena v1 · PICKING
        </footer>
      </div>
    </div>
  );
}