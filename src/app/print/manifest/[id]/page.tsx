"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ManifestPrint from "@/components/admin/ManifestPrint";

interface ManifestData {
  id: string;
  session_id: string;
  session_code: string;
  transporter_name: string;
  operator_name: string;
  courier_name: string;
  security_name: string;
  vehicle_number: string;
  total_packages_handed: number;
  total_discrepancy: number;
  signed_at: string;
  courier_signature: string | null;
  security_signature: string | null;
}

interface HistoryLog {
  id: string;
  resi_number: string;
  status: string;
  sorting_at: string;
  sorting_by: string;
  handover_at: string;
  handover_by: string;
}

export default function ManifestPrintPage() {
  const params = useParams();
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/manifest/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setManifest(data.manifest);
          setHistoryLogs(data.history_logs || []);
        }
      } catch (error) {
        console.error("Error fetching manifest:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  // Auto print after load
        useEffect(() => {
        if (!loading && manifest) {
            document.title = `Handover-${manifest.session_code}`;
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
          <p className="text-slate-500 text-sm mt-4">Loading manifest...</p>
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

  return <ManifestPrint manifest={manifest} historyLogs={historyLogs} />;
}