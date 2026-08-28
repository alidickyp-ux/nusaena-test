"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Printer, ArrowLeft, Video } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";

interface BoxData {
  id: string;
  reference: string;
  box_id: string;
  box_number: string;
  weight: string;
  volume: string | null;
  site: string;
  staging_location: string;
  store_name: string;
  address: string;
  city: string;
  province: string;
  loading_status: string;
  delivery_number: string | null;
  brand: string | null;
  putaway_at: string;
}

const SENDER = {
  name: "PT DUA PULUH TIGA",
  address: "Jl. Kopo Bihbul Raya No.68, Sayati, Margahayu, Bandung 40228",
};

const INK = "#000000";

export default function B2BLabelByReferencePage() {
  const params = useParams();

  const rawReference = (params.reference as string) || "";
  const reference = decodeURIComponent(rawReference);

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [totals, setTotals] = useState({ total_box: 0, total_weight: 0, total_volume: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reference && reference !== "[reference]") {
      fetchData();
    } else {
      setError("Invalid reference");
      setLoading(false);
    }
  }, [reference]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const boxRes = await fetch(`/api/b2b/putaway/list/${encodeURIComponent(reference)}`, {
        cache: "no-store",
      });

      if (!boxRes.ok) {
        const errorData = await boxRes.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${boxRes.status}`);
      }

      const boxData = await boxRes.json();
      const fetchedBoxes: BoxData[] = boxData.data?.boxes || [];
      setBoxes(fetchedBoxes);

      const summedWeight = fetchedBoxes.reduce((sum, b) => sum + (parseFloat(b.weight) || 0), 0);
      const summedVolume = fetchedBoxes.reduce((sum, b) => sum + (parseFloat(b.volume || "0") || 0), 0);

      setTotals({
        total_box: boxData.data?.total_box || fetchedBoxes.length,
        total_weight: boxData.data?.total_weight || summedWeight,
        total_volume: boxData.data?.total_volume || summedVolume,
      });
    } catch (err) {
      console.error("Error fetching label data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const firstBox = boxes[0] || {};
  const refNumber = reference;

  useEffect(() => {
    if (!loading && qrCanvasRef.current && refNumber) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        refNumber,
        {
          width: 75,
          margin: 0,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
          errorCorrectionLevel: "M",
        },
        (err) => {
          if (err) console.error("QR Code render error:", err);
        }
      );
    }
  }, [refNumber, loading]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0B2B4A] rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-xs mt-4">Loading label...</p>
        </div>
      </div>
    );
  }

  if (error || boxes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-6 bg-white rounded-xl border border-stone-200">
          <p className="text-red-500 font-bold text-sm">{error || "Data tidak ditemukan"}</p>
          <Link href="/b2b/putaway" className="mt-4 inline-block text-xs bg-stone-900 text-white px-4 py-2 rounded-lg font-bold uppercase">
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  const shipToLine = [firstBox.address, firstBox.city, firstBox.province].filter(Boolean).join(", ");

  // Dimensi 10 cm x 12 cm
  const LABEL_W = 378;
  const LABEL_H = 453;
  const PAD_X = 12;
  const PAD_Y = 10;

  return (
    <div className="min-h-screen bg-slate-100 p-6 flex flex-col items-center justify-start">
      {/* Action Bar */}
      <div className="mb-4 flex items-center justify-between no-print" style={{ width: `${LABEL_W}px` }}>
        <Link href="/b2b/putaway" className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold uppercase tracking-wider transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </Link>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0B2B4A] hover:bg-[#153e66] text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" /> Print Label
        </button>
      </div>

      {/* Printable Area */}
      <div
        id="print-area"
        style={{
          width: `${LABEL_W}px`,
          height: `${LABEL_H}px`,
          position: "relative",
          backgroundColor: "#ffffff",
          border: "2px solid #000000",
          boxSizing: "border-box",
          padding: `${PAD_Y}px ${PAD_X}px`,
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
          overflow: "hidden",
          color: INK,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* Banner Warning Video Unboxing */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "1.5px solid #000000",
            padding: "4px 6px",
            backgroundColor: "#ffffff",
            flexShrink: 0,
            marginBottom: "6px",
          }}
        >
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            <Video style={{ width: "26px", height: "26px", color: "#000000" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, lineHeight: "1.1" }}>
            <span style={{ display: "block", fontSize: "9.5px", fontWeight: 900, color: INK, letterSpacing: "0.2px" }}>
              WAJIB VIDEO UNBOXING !!!
            </span>
            <span style={{ display: "block", fontSize: "8px", fontWeight: 800, color: INK, marginTop: "1px" }}>
              TANPA VIDEO SEGALA BENTUK KOMPLAIN TIDAK DITERIMA
            </span>
          </div>
        </div>

        {/* Header Title & Destinasi */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "6px",
            borderBottom: "2px solid #000000",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "15px", fontWeight: 900, letterSpacing: "0.5px", color: INK }}>
            SHIPPING LABEL
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 900,
              backgroundColor: "#000000",
              color: "#ffffff",
              padding: "3px 8px",
              borderRadius: "2px",
              letterSpacing: "0.5px",
              whiteSpace: "nowrap",
            }}
          >
            {(firstBox.city || "DOMESTIC").toUpperCase()}
          </span>
        </div>

        {/* Reference & QR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 0",
            borderBottom: "1.5px solid #000000",
            flexShrink: 0,
            gap: "8px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: "4px" }}>
              <span style={{ display: "block", fontSize: "7.5px", fontWeight: 900, color: "#333", letterSpacing: "0.3px" }}>
                REFERENCE NUMBER
              </span>
              <span style={{ display: "block", fontSize: "13px", fontWeight: 900, fontFamily: "monospace", color: INK }}>
                {refNumber}
              </span>
            </div>
            <div>
              <span style={{ display: "block", fontSize: "7.5px", fontWeight: 900, color: "#333", letterSpacing: "0.3px" }}>
                DELIVERY NUMBER
              </span>
              <span style={{ display: "block", fontSize: "11px", fontWeight: 800, fontFamily: "monospace", color: INK }}>
                {firstBox.delivery_number || "-"}
              </span>
            </div>
          </div>
          <div style={{ flexShrink: 0, border: "1px solid #000", padding: "3px" }}>
            <canvas ref={qrCanvasRef} style={{ display: "block" }} />
          </div>
        </div>

        {/* Sender & Receiver */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            padding: "6px 0",
            borderBottom: "1.5px solid #000000",
            flex: "1 1 auto",
            minHeight: 0,
          }}
        >
          {/* Pengirim */}
          <div style={{ flexShrink: 0 }}>
            <span style={{ display: "block", fontSize: "8.5px", fontWeight: 900, color: "#444", letterSpacing: "0.3px" }}>
              FROM (SENDER):
            </span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: "9.5px", fontWeight: 900, color: INK }}>{SENDER.name}</span>
              <span style={{ fontSize: "8px", fontWeight: 800, color: INK }}>Brand: {firstBox.brand || "-"}</span>
            </div>
            <span style={{ display: "block", fontSize: "9px", fontWeight: 700, color: INK, lineHeight: "1.25", marginTop: "1px" }}>
              {SENDER.address}
            </span>
          </div>

          {/* Penerima (Fleksibel & Luas) */}
          <div
            style={{
              border: "1.5px solid #000",
              padding: "6px 8px",
              backgroundColor: "#fff",
              flex: "1 1 auto",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <span style={{ display: "block", fontSize: "8px", fontWeight: 900, color: "#000", letterSpacing: "0.3px", marginBottom: "2px", flexShrink: 0 }}>
              SHIP TO (RECEIVER):
            </span>
            <span style={{ display: "block", fontSize: "12px", fontWeight: 900, color: INK, lineHeight: "1.2", flexShrink: 0, marginBottom: "3px" }}>
              {firstBox.store_name || "-"}
            </span>
            <span
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 5,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontSize: "9.5px",
                fontWeight: 600,
                color: INK,
                lineHeight: "1.35",
                wordBreak: "break-word",
              }}
            >
              {shipToLine}
            </span>
          </div>
        </div>

        {/* Metric Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            borderBottom: "1.5px solid #000000",
            flexShrink: 0,
            textAlign: "center",
          }}
        >
          <div style={{ padding: "5px 2px", borderRight: "1px solid #000" }}>
            <span style={{ display: "block", fontSize: "7.5px", fontWeight: 900, color: "#444" }}>TOTAL BOX</span>
            <span style={{ fontSize: "16px", fontWeight: 900, color: INK }}>{totals.total_box}</span>
          </div>
          <div style={{ padding: "5px 2px", borderRight: "1px solid #000" }}>
            <span style={{ display: "block", fontSize: "7.5px", fontWeight: 900, color: "#444" }}>WEIGHT</span>
            <span style={{ fontSize: "16px", fontWeight: 900, color: INK }}>
              {totals.total_weight.toFixed(1)} <span style={{ fontSize: "8.5px" }}>KG</span>
            </span>
          </div>
          <div style={{ padding: "5px 2px" }}>
            <span style={{ display: "block", fontSize: "7.5px", fontWeight: 900, color: "#444" }}>VOLUME</span>
            <span style={{ fontSize: "16px", fontWeight: 900, color: INK }}>
              {totals.total_volume.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "4px",
            paddingTop: "2px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "7.5px",
            fontWeight: 800,
            color: "#444",
            flexShrink: 0,
          }}
        >
          <span>SITE: {firstBox.site || "-"}</span>
          <span>STAGING: {firstBox.staging_location || "-"}</span>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden;
          }
          #print-area,
          #print-area * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 378px !important;
            height: 453px !important;
            border: 2px solid #000000 !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
        }
        @page {
          size: 100mm 120mm;
          margin: 0;
        }
      `}</style>
    </div>
  );
}