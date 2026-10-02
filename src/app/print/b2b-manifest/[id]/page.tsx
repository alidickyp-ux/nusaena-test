"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import B2BManifestPrint from "@/components/admin/B2BManifestPrint";

interface ManifestData {
  id: string;
  delivery_number: string;
  vendor_name: string;
  total_box: number;
  total_weight: string;
  delivered_status: string;
  loading_date: string;
  arrive_date: string | null;
  resi_number: string | null;
  reference_price: string | null;
  cost: string;
  ppn: string;
}

interface DetailRow {
  reference: string;
  box_id: string;
  box_number: string;
  weight: string;
  site: string;
  staging_location: string;
  store_name: string;
  loading_status: string;
  driver: string | null;
  operator: string | null;
  security: string | null;
  police_number: string | null;
  driver_sign: string | null;
  security_sign: string | null;
  putaway_at: string;
  loading_at: string | null;
}

export default function B2BManifestPrintPage() {
  const params = useParams();
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pastikan id selalu string (bisa jadi string[] kalau catch-all route)
  const manifestId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!manifestId) {
      setError("ID manifest tidak valid");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/b2b/manifest/${manifestId}`, { cache: "no-store" });
        
        if (!res.ok) {
          setError("Gagal memuat data manifest");
          return;
        }

        const json = await res.json();

        // 🔥 Null safety: pastikan data.data ada
        if (!json?.data) {
          setError("Data manifest tidak ditemukan");
          return;
        }

        // 🔥 Null safety: manifest bisa null
        if (!json.data.manifest) {
          setError("Manifest tidak ditemukan");
          return;
        }

        setManifest(json.data.manifest);
        setDetails(Array.isArray(json.data.details) ? json.data.details : []);
      } catch (err) {
        console.error("Error fetching B2B manifest:", err);
        setError("Terjadi kesalahan saat memuat data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [manifestId]);

  // Auto print after load
  useEffect(() => {
    if (!loading && manifest && !error) {
      // 🔥 Null safety: fallback jika delivery_number null
      const dn = manifest.delivery_number || manifest.id?.slice(0, 8) || "Unknown";
      document.title = `SuratJalan-${dn}`;
      
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [loading, manifest, error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0B2B4A] rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm mt-4">Loading surat jalan...</p>
        </div>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-red-500 font-medium">
            {error || "Manifest tidak ditemukan"}
          </p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return <B2BManifestPrint manifest={manifest} details={details} />;
}