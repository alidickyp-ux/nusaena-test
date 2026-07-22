"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import JsBarcode from "jsbarcode";

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

// 🔥 Satu warna teks tegas untuk semua isi label — tanpa abu-abu/biru,
// supaya kontras dan kebaca jelas di thermal printer.
const INK = "#000000";

export default function B2BLabelByReferencePage() {
  const params = useParams();
  const reference = params.reference as string;
  const barcodeRef = useRef<SVGSVGElement>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // 🔥 total_volume dari API kadang kosong/0 walau box-nya punya nilai
      // volume masing-masing (lihat contoh data: box.volume = "0.600" tapi
      // total_volume API balikin 0). Jadi jangan cuma percaya total dari
      // API — jumlahkan juga langsung dari boxes sebagai fallback, dan
      // pakai yang lebih besar / yang ada datanya.
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

  const firstBox = boxes[0];
  const refNumber = reference;

  useEffect(() => {
    if (barcodeRef.current && refNumber) {
      try {
        JsBarcode(barcodeRef.current, refNumber, {
          format: "CODE128",
          width: 2.4,
          height: 60,
          displayValue: false,
          margin: 0,
          background: "#ffffff",
        });
      } catch (e) {
        console.error("Barcode render error:", e);
      }
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

  // 🔥 Label ukuran fisik 100mm x 60mm. 378px lebar ≈ 100mm (skala ~3.78px/mm),
  // jadi padding 3mm ≈ 11px di kedua sisi.
  const PAD = 11; // 3mm

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-start">
      <div className="w-[378px] mb-3 flex items-center justify-between no-print">
        <Link href="/b2b/putaway" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider transition-colors">
          <ArrowLeft className="w-3 h-3" /> Kembali
        </Link>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0B2B4A] hover:bg-[#153e66] text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all"
        >
          <Printer className="w-3.5 h-3.5" /> Print Label
        </button>
      </div>

      <div
        id="print-area"
        style={{
          width: "378px",
          height: "226px",
          position: "relative",
          backgroundColor: "#ffffff",
          border: "1px solid #000000",
          boxSizing: "border-box",
          padding: `${PAD}px`,
          fontFamily: "Arial, 'Helvetica Neue', sans-serif",
          overflow: "hidden",
          color: INK,
          display: "flex",
          flexDirection: "column",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "3px",
            borderBottom: "1.5px solid #000000",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 900, letterSpacing: "0.5px", color: INK }}>
            AWB LABEL
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 900,
              backgroundColor: "#000000",
              color: "#ffffff",
              padding: "2px 8px",
              borderRadius: "3px",
              letterSpacing: "0.3px",
              whiteSpace: "nowrap",
            }}
          >
            {(firstBox.city || "DOMESTIC").toUpperCase()}
          </span>
        </div>

        {/* Reference / Delivery */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            padding: "4px 0",
            borderBottom: "1px solid #000000",
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: "7.5px", fontWeight: 900, color: INK, letterSpacing: "0.3px" }}>
              REFERENCE NUMBER
            </span>
            <span
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 900,
                fontFamily: "monospace",
                color: INK,
                whiteSpace: "nowrap",
              }}
            >
              {refNumber}
            </span>
          </div>
          <div style={{ minWidth: 0, textAlign: "right" }}>
            <span style={{ display: "block", fontSize: "7.5px", fontWeight: 900, color: INK, letterSpacing: "0.3px" }}>
              DELIVERY NUMBER
            </span>
            <span
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 900,
                fontFamily: "monospace",
                color: INK,
                whiteSpace: "nowrap",
              }}
            >
              {firstBox.delivery_number || "-"}
            </span>
          </div>
        </div>

        {/* Sender / Ship To */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "5px 0",
            borderBottom: "1px solid #000000",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: "1 1 0", minWidth: 0, borderRight: "1px solid #000000", paddingRight: "8px" }}>
            <span style={{ display: "block", fontSize: "7.5px", fontWeight: 900, color: INK, letterSpacing: "0.3px", marginBottom: "2px" }}>
              SENDER
            </span>
            <span style={{ display: "block", fontSize: "9.5px", fontWeight: 900, color: INK }}>
              {SENDER.name}
            </span>
            <span
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontSize: "8px",
                fontWeight: 800,
                color: INK,
                lineHeight: "1.3",
                marginTop: "2px",
              }}
            >
              {SENDER.address}
            </span>
            <span style={{ display: "block", fontSize: "8px", fontWeight: 900, color: INK, marginTop: "3px" }}>
              Brand: {firstBox.brand || "-"}
            </span>
          </div>

          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <span style={{ display: "block", fontSize: "7.5px", fontWeight: 900, color: INK, letterSpacing: "0.3px", marginBottom: "2px" }}>
              SHIP TO (RECEIVER)
            </span>
            <span style={{ display: "block", fontSize: "9.5px", fontWeight: 900, color: INK }}>
              {firstBox.store_name || "-"}
            </span>
            <span
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontSize: "8px",
                fontWeight: 800,
                color: INK,
                lineHeight: "1.3",
                marginTop: "2px",
              }}
            >
              {shipToLine}
            </span>
          </div>
        </div>

        {/* Qty / Weight / Volume — selalu 3-3nya tampil */}
        <div
          style={{
            display: "flex",
            padding: "4px 0",
            borderBottom: "1px solid #000000",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: "0 0 33%" }}>
            <span style={{ fontSize: "8px", fontWeight: 900, color: INK, marginRight: "3px" }}>QTY:</span>
            <span style={{ fontSize: "16px", fontWeight: 900, color: INK }}>{totals.total_box}</span>
            <span style={{ fontSize: "8px", color: INK, fontWeight: 900, marginLeft: "2px" }}>BOX</span>
          </div>
          <div style={{ flex: "0 0 34%" }}>
            <span style={{ fontSize: "8px", fontWeight: 900, color: INK, marginRight: "3px" }}>WEIGHT:</span>
            <span style={{ fontSize: "16px", fontWeight: 900, color: INK }}>{totals.total_weight.toFixed(1)}</span>
            <span style={{ fontSize: "8px", color: INK, fontWeight: 900, marginLeft: "2px" }}>KG</span>
          </div>
          <div style={{ flex: "0 0 33%" }}>
            <span style={{ fontSize: "8px", fontWeight: 900, color: INK, marginRight: "3px" }}>VOLUME:</span>
            <span style={{ fontSize: "16px", fontWeight: 900, color: INK }}>{totals.total_volume.toFixed(2)}</span>
            <span style={{ fontSize: "8px", color: INK, fontWeight: 900, marginLeft: "2px" }}></span>
          </div>
        </div>

        {/* Items */}
        <div style={{ padding: "3px 0", flexShrink: 0 }}>
          <div
            style={{
              fontSize: "7.5px",
              fontWeight: 800,
              fontFamily: "monospace",
              color: INK,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span style={{ fontWeight: 900 }}>ITEMS:</span> {boxes.map((d) => `${d.box_number}(${d.weight}kg)`).join(" • ")}
          </div>
        </div>

        {/* Barcode */}
        <div
          style={{
            flex: "1 1 0",
            minHeight: 0,
            display: "flex",
            alignItems: "left",
            justifyContent: "center",
          }}
        >
          <svg ref={barcodeRef} style={{ width: "100%", height: "100%" }} />
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
            height: 226px !important;
            border: 1px solid #000000 !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
        }
        @page {
          size: 100mm 60mm;
          margin: 0;
        }
      `}</style>
    </div>
  );
}