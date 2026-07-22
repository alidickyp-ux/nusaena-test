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
          width: 2.5,
          height: 45,
          displayValue: false,
          margin: 0,
          background: "#ffffff",
          lineColor: "#000000",
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
  const displayBrand = firstBox.brand && firstBox.brand !== "-" ? firstBox.brand : "-";

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
          border: "2px solid #000000",
          boxSizing: "border-box",
          padding: "3mm",
          fontFamily: "'Courier New', Courier, monospace",
          overflow: "hidden",
          color: "#000000"
        }}
      >
        {/* Header - AWB LABEL & CITY */}
        <div style={{ 
          height: "26px", 
          borderBottom: "2px solid #000000", 
          position: "relative",
          marginBottom: "2px"
        }}>
          <span style={{ 
            fontSize: "14px", 
            fontWeight: "900", 
            letterSpacing: "1px", 
            color: "#000000", 
            position: "absolute", 
            left: "0", 
            top: "0" 
          }}>
            AWB LABEL
          </span>
          <span style={{ 
            fontSize: "12px", 
            fontWeight: "900", 
            backgroundColor: "#000000", 
            color: "#ffffff", 
            padding: "2px 10px", 
            borderRadius: "2px", 
            position: "absolute", 
            right: "0", 
            top: "-2px", 
            letterSpacing: "0.5px" 
          }}>
            {(firstBox.city || "DOMESTIC").toUpperCase()}
          </span>
        </div>

        {/* Reference & Delivery Number */}
        <div style={{ 
          height: "30px", 
          borderBottom: "2px solid #000000", 
          position: "relative", 
          paddingTop: "2px",
          marginBottom: "2px"
        }}>
          <div style={{ position: "absolute", left: "0", width: "180px" }}>
            <span style={{ 
              display: "block", 
              fontSize: "7px", 
              fontWeight: "900", 
              color: "#000000", 
              letterSpacing: "0.5px",
              textTransform: "uppercase"
            }}>
              REFERENCE NUMBER
            </span>
            <span style={{ 
              fontSize: "13px", 
              fontWeight: "900", 
              fontFamily: "'Courier New', monospace", 
              color: "#000000" 
            }}>
              {refNumber}
            </span>
          </div>
          <div style={{ position: "absolute", right: "0", width: "170px", textAlign: "right" }}>
            <span style={{ 
              display: "block", 
              fontSize: "7px", 
              fontWeight: "900", 
              color: "#000000", 
              letterSpacing: "0.5px",
              textTransform: "uppercase"
            }}>
              DELIVERY NUMBER
            </span>
            <span style={{ 
              fontSize: "13px", 
              fontWeight: "900", 
              fontFamily: "'Courier New', monospace", 
              color: "#000000" 
            }}>
              {firstBox.delivery_number || "-"}
            </span>
          </div>
        </div>

        {/* Sender & Receiver */}
        <div style={{ 
          height: "58px", 
          borderBottom: "2px solid #000000", 
          position: "relative", 
          paddingTop: "2px",
          marginBottom: "2px"
        }}>
          <div style={{ 
            position: "absolute", 
            left: "0", 
            width: "175px", 
            borderRight: "2px solid #000000", 
            height: "52px", 
            paddingRight: "6px" 
          }}>
            <span style={{ 
              display: "block", 
              fontSize: "7px", 
              fontWeight: "900", 
              color: "#000000", 
              letterSpacing: "0.5px", 
              marginBottom: "1px",
              textTransform: "uppercase"
            }}>
              SENDER
            </span>
            <span style={{ 
              display: "block", 
              fontSize: "10px", 
              fontWeight: "900", 
              color: "#000000",
              marginBottom: "1px"
            }}>
              {SENDER.name}
            </span>
            <span style={{ 
              display: "block", 
              fontSize: "8px", 
              fontWeight: "700", 
              color: "#000000", 
              lineHeight: "1.3", 
              marginTop: "1px" 
            }}>
              {SENDER.address}
            </span>
            <span style={{ 
              display: "block", 
              fontSize: "8px", 
              fontWeight: "900", 
              color: "#000000", 
              marginTop: "2px" 
            }}>
              Brand: {displayBrand}
            </span>
          </div>

          <div style={{ position: "absolute", left: "185px", width: "173px" }}>
            <span style={{ 
              display: "block", 
              fontSize: "7px", 
              fontWeight: "900", 
              color: "#000000", 
              letterSpacing: "0.5px", 
              marginBottom: "1px",
              textTransform: "uppercase"
            }}>
              SHIP TO (RECEIVER)
            </span>
            <span style={{ 
              display: "block", 
              fontSize: "10px", 
              fontWeight: "900", 
              color: "#000000",
              marginBottom: "1px"
            }}>
              {firstBox.store_name || "-"}
            </span>
            <span style={{ 
              display: "block", 
              fontSize: "8px", 
              fontWeight: "700", 
              color: "#000000", 
              lineHeight: "1.3", 
              marginTop: "1px" 
            }}>
              {shipToLine}
            </span>
          </div>
        </div>

        {/* QTY, WEIGHT, VOLUME */}
        <div style={{ 
          height: "30px", 
          borderBottom: "2px solid #000000", 
          position: "relative", 
          paddingTop: "2px",
          display: "flex",
          marginBottom: "2px"
        }}>
          <div style={{ flex: hasVolume ? "0 0 33%" : "0 0 50%" }}>
            <span style={{ 
              fontSize: "9px", 
              fontWeight: "900", 
              color: "#000000", 
              marginRight: "2px",
              textTransform: "uppercase"
            }}>
              QTY:
            </span>
            <span style={{ 
              fontSize: "20px", 
              fontWeight: "900", 
              color: "#000000" 
            }}>
              {totals.total_box}
            </span>
            <span style={{ 
              fontSize: "9px", 
              color: "#000000", 
              fontWeight: "900", 
              marginLeft: "2px",
              textTransform: "uppercase"
            }}>
              BOX
            </span>
          </div>
          <div style={{ flex: hasVolume ? "0 0 34%" : "0 0 50%" }}>
            <span style={{ 
              fontSize: "9px", 
              fontWeight: "900", 
              color: "#000000", 
              marginRight: "2px",
              textTransform: "uppercase"
            }}>
              WEIGHT:
            </span>
            <span style={{ 
              fontSize: "20px", 
              fontWeight: "900", 
              color: "#000000" 
            }}>
              {totals.total_weight.toFixed(1)}
            </span>
            <span style={{ 
              fontSize: "9px", 
              color: "#000000", 
              fontWeight: "900", 
              marginLeft: "2px",
              textTransform: "uppercase"
            }}>
              KG
            </span>
          </div>
          {hasVolume && (
            <div style={{ flex: "0 0 33%" }}>
              <span style={{ 
                fontSize: "9px", 
                fontWeight: "900", 
                color: "#000000", 
                marginRight: "2px",
                textTransform: "uppercase"
              }}>
                VOL:
              </span>
              <span style={{ 
                fontSize: "20px", 
                fontWeight: "900", 
                color: "#000000" 
              }}>
                {totals.total_volume.toFixed(2)}
              </span>
              <span style={{ 
                fontSize: "9px", 
                color: "#000000", 
                fontWeight: "900", 
                marginLeft: "2px",
                textTransform: "uppercase"
              }}>
                M³
              </span>
            </div>
          )}
        </div>

        {/* Items List */}
        <div style={{ 
          height: "18px", 
          paddingTop: "2px",
          borderBottom: "2px solid #000000",
          marginBottom: "2px"
        }}>
          <div style={{ 
            fontSize: "8px", 
            fontFamily: "'Courier New', monospace", 
            color: "#000000", 
            fontWeight: "700",
            whiteSpace: "nowrap", 
            overflow: "hidden", 
            textOverflow: "ellipsis" 
          }}>
            <span style={{ fontWeight: "900" }}>ITEMS:</span> {boxes.map((d) => `${d.box_number}(${d.weight}kg)`).join(" • ")}
          </div>
        </div>

        {/* Barcode */}
        <div style={{ 
          position: "absolute", 
          bottom: "3mm", 
          left: "3mm", 
          right: "3mm", 
          height: "48px", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center" 
        }}>
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
            border: 2px solid #000000 !important;
            box-sizing: border-box !important;
            padding: 3mm !important;
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