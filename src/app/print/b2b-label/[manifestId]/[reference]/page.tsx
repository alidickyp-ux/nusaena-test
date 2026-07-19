"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";

interface ManifestData {
  id: string;
  delivery_number: string;
  vendor_name: string;
  total_box: number;
  total_weight: string;
  loading_date: string;
}

interface DetailRow {
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
  driver: string | null;
  operator: string | null;
  security: string | null;
  police_number: string | null;
  putaway_at: string;
  loading_at: string | null;
}

export default function B2BLabelPage() {
  const params = useParams();
  // 🔥 Ambil params dengan benar
  const manifestId = params.manifestId as string;
  const reference = params.reference as string;

  console.log("📦 Params:", { manifestId, reference });

  const [loading, setLoading] = useState(true);
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (manifestId && manifestId !== '[manifestId]' && reference && reference !== '[reference]') {
      fetchData();
    } else {
      setError("Invalid parameters");
      setLoading(false);
    }
  }, [manifestId, reference]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("🔍 Fetching manifest:", manifestId);
      const res = await fetch(`/api/b2b/manifest/${manifestId}`, { cache: "no-store" });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log("📦 Data received:", data);
      
      setManifest(data.data.manifest);
      
      const filteredDetails = data.data.details.filter((d: any) => d.reference === reference);
      setDetails(filteredDetails);
      
      if (filteredDetails.length === 0) {
        setError(`No details found for reference: ${reference}`);
      }
    } catch (error) {
      console.error("Error fetching label data:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0B2B4A] rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm mt-4">Loading label...</p>
        </div>
      </div>
    );
  }

  if (error || !manifest || details.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">{error || "Data tidak ditemukan"}</p>
          <p className="text-sm text-slate-400 mt-2">
            Manifest ID: {manifestId}<br />
            Reference: {reference}
          </p>
          <button
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const firstDetail = details[0];
  const totalWeight = details.reduce((sum, d) => sum + parseFloat(d.weight || "0"), 0);
  const totalKoli = details.length;

  const today = new Date();
  const dateStr = today.toISOString().slice(2, 10).replace(/-/g, "");
  const refNumber = `MAR-${dateStr}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-[100mm] mx-auto mb-4 flex justify-end no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-[#0B2B4A] hover:bg-[#123a5e] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Label
        </button>
      </div>

      <div 
        id="print-area"
        className="mx-auto bg-white border-2 border-black rounded-sm overflow-hidden"
        style={{ 
          width: "100mm", 
          minHeight: "60mm",
          maxWidth: "100mm",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div className="p-2 text-[8px] leading-tight" style={{ fontSize: "7px" }}>
          <div className="text-center font-bold text-[10px] border-b border-black pb-0.5 mb-0.5">
            AWB LABEL
          </div>

          <div className="grid grid-cols-2 border-b border-black pb-0.5 mb-0.5">
            <div>
              <span className="font-bold">TRANSACTION TYPE</span>
              <span className="ml-1">MARKETING</span>
            </div>
            <div className="text-right">
              <span className="font-bold">DELIVERY NUMBER</span>
              <span className="ml-1">{manifest.delivery_number}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 border-b border-black pb-0.5 mb-0.5">
            <div>
              <div className="font-bold text-[6px]">SENDER (BRAND)</div>
              <div className="text-[6px] font-bold">PT DUA PULUH TIGA</div>
              <div className="text-[5px] leading-tight">
                Jl. Kopo Bihbul Raya No.68, Sayati, Margahayu, Bandung, Jawa Barat 40228
              </div>
              <div className="text-[5px] font-bold mt-0.5">
                Brand: BP
              </div>
            </div>
            <div>
              <div className="font-bold text-[6px]">RECEIVER (SHIP TO)</div>
              <div className="text-[6px] font-bold">{firstDetail.store_name || "-"}</div>
              <div className="text-[5px] leading-tight">
                {[
                  firstDetail.address,
                  firstDetail.city,
                  firstDetail.province,
                  "Indonesia"
                ].filter(Boolean).join(", ")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-black pb-0.5 mb-0.5">
            <div>
              <span className="font-bold">TOTAL KOLI</span>
              <span className="ml-1 text-[10px] font-bold">{totalKoli}</span>
            </div>
            <div className="text-right">
              <span className="font-bold">BERAT (WEIGHT)</span>
              <span className="ml-1 text-[10px] font-bold">{totalWeight.toFixed(1)} Kg</span>
            </div>
          </div>

          <div className="border-b border-black pb-0.5 mb-0.5">
            <div>
              <span className="font-bold">VOLUME METRICS</span>
              <span className="ml-1">-</span>
            </div>
          </div>

          <div className="grid grid-cols-2">
            <div>
              <span className="font-bold">REF NUMBER:</span>
              <span className="ml-1">{refNumber}</span>
            </div>
            <div className="text-right">
              <span className="font-bold">DEST:</span>
              <span className="ml-1">{firstDetail.city || "-"}</span>
            </div>
          </div>

          {details.length > 1 && (
            <div className="mt-0.5 border-t border-black pt-0.5">
              <div className="text-[5px] font-bold">BOX LIST:</div>
              <div className="text-[4px] leading-tight">
                {details.map((d, i) => (
                  <span key={d.box_id}>
                    {d.box_number} ({d.weight}kg){i < details.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100mm;
            height: 60mm;
            margin: 0;
            padding: 0;
            border: 2px solid black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}