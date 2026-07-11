"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";

export default function MenuPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const { user } = await res.json();
        setFullName(user.full_name);
      } catch (error) {
        console.error("Error loading user:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        showToast.success("Berhasil logout");
        router.push("/login");
      }
    } catch (error) {
      showToast.error("Gagal logout");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-md mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-2">
        <div>
          <p className="text-[0.6rem] text-stone-400 font-mono font-bold uppercase tracking-wider">COOL NATIVE APP</p>
          <p className="text-stone-900 font-semibold text-base mt-0.5">Halo, {fullName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors"
        >
          Logout
        </button>
      </div>

      <p className="text-stone-500 text-xs mb-10">Pilih jenis operasi yang ingin dijalankan</p>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.push("/sorting")}
          className="bg-white border-2 border-stone-200 rounded-2xl p-6 text-left hover:border-orange-500 active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="text-stone-900 font-extrabold text-lg">B2C</div>
          <div className="text-stone-500 text-xs mt-1">Sorting &amp; Handover paket retail</div>
        </button>

        <button
          onClick={() => router.push("/b2b")}
          className="bg-white border-2 border-stone-200 rounded-2xl p-6 text-left hover:border-stone-400 active:scale-[0.98] transition-all shadow-sm hover:shadow-md opacity-50 cursor-not-allowed"
          disabled
        >
          <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </div>
          <div className="text-stone-900 font-extrabold text-lg">B2B</div>
          <div className="text-stone-500 text-xs mt-1">Putaway &amp; Loading gudang (segera hadir)</div>
        </button>
      </div>

      <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold mt-auto pt-10">
        COOL SYSTEM V3
      </footer>
    </div>
  );
}