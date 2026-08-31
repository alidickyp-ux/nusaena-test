'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';

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
  // TODO: ganti dengan session/operator dari auth yang sudah ada di project
  const [pickingSessionId, setPickingSessionId] = useState<string>('');

  const [location, setLocation] = useState('');
  const [expectedLines, setExpectedLines] = useState<ExpectedLine[]>([]);
  const [locationError, setLocationError] = useState('');

  const [artikelInput, setArtikelInput] = useState('');
  const [selectedLine, setSelectedLine] = useState<ExpectedLine | null>(null);
  const [qty, setQty] = useState<string>('');

  const [flagType, setFlagType] = useState<string | null>(null);
  const [flagNote, setFlagNote] = useState('');
  const [saveError, setSaveError] = useState('');

  const [savedLines, setSavedLines] = useState<SavedLine[]>([]);

  const locationInputRef = useRef<HTMLInputElement>(null);
  const artikelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    locationInputRef.current?.focus();
  }, []);

  async function handleScanLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!location) return;
    setLocationError('');

    const res = await fetch(
      `/api/b2b/picking/location?soId=${soId}&location=${encodeURIComponent(location)}`
    );
    const data = await res.json();

    if (!res.ok) {
      setLocationError(data.error ?? 'Lokasi tidak ditemukan');
      setExpectedLines([]);
      return;
    }

    setExpectedLines(data.lines);
    setTimeout(() => artikelInputRef.current?.focus(), 0);
  }

  function handleScanArtikel(e: React.FormEvent) {
    e.preventDefault();
    const match = expectedLines.find((l) => l.artikel === artikelInput);
    setSelectedLine(match ?? null);
    if (!match) {
      // Artikel tidak terdaftar di lokasi ini untuk SO ini — arahkan ke flag.
      setFlagType('FOUND');
    } else {
      setFlagType(null);
    }
    setQty('');
    setFlagNote('');
    setSaveError('');
  }

  async function handleSave() {
    setSaveError('');
    const qtyNum = Number(qty);

    if (!qtyNum || qtyNum <= 0) {
      setSaveError('Isi qty terlebih dahulu');
      return;
    }
    if (flagType && !flagNote.trim()) {
      setSaveError('Isi catatan untuk flag yang dipilih');
      return;
    }
    if (!selectedLine && !flagType) {
      setSaveError('Artikel tidak dikenali — pilih flag terlebih dahulu');
      return;
    }

    const res = await fetch('/api/b2b/picking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickingSessionId,
        soLineId: selectedLine?.soLineId,
        artikel: artikelInput,
        location,
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

    setSavedLines((prev) => [
      { artikel: artikelInput, location, qty: qtyNum, flagType },
      ...prev,
    ]);

    // reset ke step scan artikel, tetap di lokasi yang sama
    setArtikelInput('');
    setSelectedLine(null);
    setQty('');
    setFlagType(null);
    setFlagNote('');
    artikelInputRef.current?.focus();

    // refresh sisa qty di lokasi ini
    handleScanLocation({ preventDefault: () => {} } as React.FormEvent);
  }

  return (
    <div className="max-w-sm mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-base font-medium">Picking SO {soId}</h1>
      </div>

      <form onSubmit={handleScanLocation} className="space-y-1">
        <label className="text-xs text-gray-500">1. Scan lokasi</label>
        <input
          ref={locationInputRef}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Scan barcode lokasi"
          className="w-full h-10 border rounded px-3"
        />
        {locationError && <p className="text-xs text-red-600">{locationError}</p>}
      </form>

      {expectedLines.length > 0 && (
        <>
          <form onSubmit={handleScanArtikel} className="space-y-1">
            <label className="text-xs text-gray-500">2. Scan artikel</label>
            <input
              ref={artikelInputRef}
              value={artikelInput}
              onChange={(e) => setArtikelInput(e.target.value)}
              placeholder="Scan barcode artikel"
              className="w-full h-10 border rounded px-3"
            />
            <p className="text-xs text-gray-400">
              Diharapkan di lokasi ini: {expectedLines.map((l) => l.artikel).join(', ')}
            </p>
          </form>

          {(selectedLine || flagType) && (
            <div className="space-y-3 border-t pt-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">3. Qty pick</label>
                <input
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  inputMode="numeric"
                  className="w-full h-10 border rounded px-3 text-center font-medium"
                />
                {selectedLine && (
                  <p className="text-xs text-gray-400 mt-1">
                    Sisa SO untuk artikel ini: {selectedLine.qtyRemaining} pcs
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Flag {!selectedLine && '(wajib — artikel di luar SO lokasi ini)'}
                </label>
                <select
                  value={flagType ?? ''}
                  onChange={(e) => setFlagType(e.target.value || null)}
                  className="w-full h-10 border rounded px-3"
                >
                  <option value="">Tidak ada</option>
                  {FLAG_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                {flagType && (
                  <input
                    value={flagNote}
                    onChange={(e) => setFlagNote(e.target.value)}
                    placeholder="Catatan flag"
                    className="w-full h-10 border rounded px-3 mt-2"
                  />
                )}
              </div>

              {saveError && <p className="text-xs text-red-600">{saveError}</p>}

              <button
                onClick={handleSave}
                className="w-full h-10 rounded bg-black text-white font-medium"
              >
                Simpan dan lanjut
              </button>
            </div>
          )}
        </>
      )}

      {savedLines.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs text-gray-500 mb-2">Baris tersimpan</p>
          <div className="space-y-1">
            {savedLines.map((l, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  {l.artikel} &middot; {l.location}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{l.qty} pcs</span>
                  {l.flagType && (
                    <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                      {l.flagType.toLowerCase()}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}