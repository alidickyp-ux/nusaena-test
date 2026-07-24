"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import showToast, { withToast } from '@/lib/toast';

export default function MenuPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [showB2C, setShowB2C] = useState(false);

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
        setUserRole(user.role || "");
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
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <p className="text-[0.6rem] text-stone-400 font-mono font-bold uppercase tracking-wider">Nusaena NATIVE APP</p>
          <p className="text-stone-900 font-semibold text-base mt-0.5">Halo, {fullName}</p>
          <p className="text-xs text-stone-400 mt-0.5">Role: {userRole}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors"
        >
          Logout
        </button>
      </div>

      <p className="text-stone-500 text-xs mb-6">Pilih kategori operasi</p>

      {/* 🔥 MENU UTAMA - B2B & B2C */}
      <div className="flex flex-col gap-4">
        {/* B2B - Coming Soon */}
        <button
          onClick={() => router.push("/b2b")}
          className="bg-white border-2 border-blue-200 rounded-2xl p-6 text-left hover:border-blue-500 active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div className="text-stone-900 font-extrabold text-lg">🏢 B2B</div>
              <div className="text-stone-500 text-xs mt-0.5">Putaway &amp; Loading gudang</div>
            </div>
          </div>
        </button>

        {/* 🔥 B2C - Klik untuk expand */}
        <div className="bg-white border-2 border-orange-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
          <button
            onClick={() => setShowB2C(!showB2C)}
            className="w-full p-6 text-left flex items-center justify-between hover:bg-orange-50/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <div className="text-stone-900 font-extrabold text-lg">📦 B2C</div>
                <div className="text-stone-500 text-xs mt-0.5">Sorting &amp; Handover paket retail</div>
              </div>
            </div>
            <svg 
              className={`w-5 h-5 text-stone-400 transition-transform duration-300 ${showB2C ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 🔥 SUB MENU B2C - Muncul jika showB2C = true */}
          {showB2C && (
            <div className="border-t border-orange-100 p-3 space-y-2 bg-orange-50/30">
              {/* Sorting */}
              <button
                onClick={() => router.push("/sorting")}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-orange-50 transition-colors active:scale-[0.98] border border-stone-100"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-stone-800">Sorting</p>
                  <p className="text-[10px] text-stone-400">Scan &amp; sortir paket</p>
                </div>
                <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Handover */}
              <button
                onClick={() => router.push("/handover")}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-orange-50 transition-colors active:scale-[0.98] border border-stone-100"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-stone-800">Handover</p>
                  <p className="text-[10px] text-stone-400">Serah terima ke kurir</p>
                </div>
                <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Putaway */}
              <button
                onClick={() => router.push("/putaway")}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-orange-50 transition-colors active:scale-[0.98] border border-stone-100"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-stone-800">Putaway</p>
                  <p className="text-[10px] text-stone-400">Simpan ke lokasi rak</p>
                </div>
                <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Pickup */}
              <button
                onClick={() => router.push("/pickup")}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-orange-50 transition-colors active:scale-[0.98] border border-stone-100"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-stone-800">Pickup</p>
                  <p className="text-[10px] text-stone-400">Ambil dari lokasi rak</p>
                </div>
                <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* 🔥 Admin Dashboard - Only for ADMIN */}
        {userRole === 'ADMIN' && (
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="bg-white border-2 border-indigo-200 rounded-2xl p-5 text-left hover:border-indigo-500 active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <div className="text-stone-900 font-extrabold text-lg">🛡️ Admin Dashboard</div>
                <div className="text-stone-500 text-xs mt-0.5">Kelola user dan monitoring sistem</div>
              </div>
            </div>
          </button>
        )}
      </div>

      <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold mt-auto pt-10">
        NUSAENA V1
      </footer>
    </div>
  );
}