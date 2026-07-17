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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/b2b/manifest/${params.id}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setManifest(data.data.manifest);
          setDetails(data.data.details || []);
        }
      } catch (error) {
        console.error("Error fetching B2B manifest:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  // Auto print after load
  useEffect(() => {
    if (!loading && manifest) {
      document.title = `SuratJalan-${manifest.delivery_number}`;
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [loading, manifest]);

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

  if (!manifest) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Manifest tidak ditemukan</p>
      </div>
    );
  }

  return <B2BManifestPrint manifest={manifest} details={details} />;
}