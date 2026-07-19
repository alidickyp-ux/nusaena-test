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
      setBoxes(boxData.data?.boxes || []);
      // 🔥 Pakai total yang sudah dihitung API, bukan hitung ulang di
      // client — satu sumber kebenaran untuk box count / weight / volume.
      setTotals({
        total_box: boxData.data?.total_box || 0,
        total_weight: boxData.data?.total_weight || 0,
        total_volume: boxData.data?.total_volume || 0,
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
          width: 2.0,
          height: 40,
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
  const hasVolume = totals.total_volume > 0;

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
          border: "1px solid #d6d3d1",
          boxSizing: "border-box",
          padding: "10px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          overflow: "hidden",
          color: "#1c1917"
        }}
      >
        <div style={{ height: "26px", borderBottom: "1px solid #e7e5e4", position: "relative" }}>
          <span style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.5px", color: "#0b2b4a", position: "absolute", left: "0", top: "2px" }}>
            AWB LABEL
          </span>
          <span style={{ fontSize: "10px", fontWeight: "900", backgroundColor: "#1c1917", color: "#ffffff", padding: "2px 6px", borderRadius: "4px", position: "absolute", right: "0", top: "-2px", letterSpacing: "0.5px" }}>
            {(firstBox.city || "DOMESTIC").toUpperCase()}
          </span>
        </div>

        <div style={{ height: "26px", borderBottom: "1px solid #e7e5e4", position: "relative", paddingTop: "4px" }}>
          <div style={{ position: "absolute", left: "0", width: "180px" }}>
            <span style={{ display: "block", fontSize: "5.5px", fontWeight: "700", color: "#a8a29e", letterSpacing: "0.3px" }}>REFERENCE NUMBER</span>
            <span style={{ fontSize: "9px", fontWeight: "700", fontFamily: "monospace", color: "#1c1917" }}>{refNumber}</span>
          </div>
          <div style={{ position: "absolute", right: "0", width: "170px", textAlign: "right" }}>
            <span style={{ display: "block", fontSize: "5.5px", fontWeight: "700", color: "#a8a29e", letterSpacing: "0.3px" }}>DELIVERY NUMBER</span>
            <span style={{ fontSize: "9px", fontWeight: "700", fontFamily: "monospace", color: "#1c1917" }}>{firstBox.delivery_number || "-"}</span>
          </div>
        </div>

        <div style={{ height: "54px", borderBottom: "1px solid #e7e5e4", position: "relative", paddingTop: "4px" }}>
          <div style={{ position: "absolute", left: "0", width: "175px", borderRight: "1px solid #f5f5f4", height: "46px", paddingRight: "6px" }}>
            <span style={{ display: "block", fontSize: "5.5px", fontWeight: "700", color: "#a8a29e", letterSpacing: "0.3px", marginBottom: "1px" }}>SENDER</span>
            <span style={{ display: "block", fontSize: "7px", fontWeight: "700", color: "#1c1917" }}>{SENDER.name}</span>
            <span style={{ display: "block", fontSize: "5.5px", color: "#57534e", lineHeight: "1.2", marginTop: "1px", height: "13px", overflow: "hidden" }}>{SENDER.address}</span>
            <span style={{ display: "block", fontSize: "6px", fontWeight: "700", color: "#2563eb", marginTop: "3px" }}>Brand: {firstBox.brand || "-"}</span>
          </div>

          <div style={{ position: "absolute", left: "185px", width: "173px" }}>
            <span style={{ display: "block", fontSize: "5.5px", fontWeight: "700", color: "#a8a29e", letterSpacing: "0.3px", marginBottom: "1px" }}>SHIP TO (RECEIVER)</span>
            <span style={{ display: "block", fontSize: "7px", fontWeight: "700", color: "#1c1917" }}>{firstBox.store_name || "-"}</span>
            <span style={{ display: "block", fontSize: "5.5px", color: "#57534e", lineHeight: "1.2", marginTop: "1px", height: "24px", overflow: "hidden" }}>{shipToLine}</span>
          </div>
        </div>

        <div style={{ height: "24px", borderBottom: "1px solid #e7e5e4", position: "relative", paddingTop: "3px", display: "flex" }}>
          <div style={{ flex: hasVolume ? "0 0 33%" : "0 0 50%" }}>
            <span style={{ fontSize: "6.5px", fontWeight: "700", color: "#78716c", marginRight: "3px" }}>QTY:</span>
            <span style={{ fontSize: "14px", fontWeight: "800", color: "#1c1917" }}>{totals.total_box}</span>
            <span style={{ fontSize: "6.5px", color: "#78716c", fontWeight: "700", marginLeft: "2px" }}>BOX</span>
          </div>
          <div style={{ flex: hasVolume ? "0 0 34%" : "0 0 50%" }}>
            <span style={{ fontSize: "6.5px", fontWeight: "700", color: "#78716c", marginRight: "3px" }}>WEIGHT:</span>
            <span style={{ fontSize: "14px", fontWeight: "800", color: "#1c1917" }}>{totals.total_weight.toFixed(1)}</span>
            <span style={{ fontSize: "6.5px", color: "#78716c", fontWeight: "700", marginLeft: "2px" }}>KG</span>
          </div>
          {hasVolume && (
            <div style={{ flex: "0 0 33%" }}>
              <span style={{ fontSize: "6.5px", fontWeight: "700", color: "#78716c", marginRight: "3px" }}>VOL:</span>
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#1c1917" }}>{totals.total_volume.toFixed(2)}</span>
              <span style={{ fontSize: "6.5px", color: "#78716c", fontWeight: "700", marginLeft: "2px" }}>M³</span>
            </div>
          )}
        </div>

        <div style={{ height: "14px", paddingTop: "3px" }}>
          <div style={{ fontSize: "6px", fontFamily: "monospace", color: "#78716c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ fontWeight: "bold" }}>ITEMS:</span> {boxes.map((d) => `${d.box_number}(${d.weight}kg)`).join(" • ")}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: "6px", left: "10px", right: "10px", height: "56px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
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