"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";
import OperatorShell from "@/components/mobile/OperatorShell";

export default function B2BPage() {
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

  if (loading) {
    return (
      <OperatorShell>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-stone-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
              <p className="text-stone-500 text-sm mt-4">Loading...</p>
            </div>
          </div>
        </div>
      </OperatorShell>
    );
  }

  return (
    <OperatorShell>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center px-1">
          <div>
            <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">B2B</p>
            <p className="font-extrabold text-lg text-stone-900 leading-tight">{fullName}</p>
          </div>
          <button
            onClick={() => router.push("/menu")}
            className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg font-medium"
          >
            ← Menu
          </button>
        </div>

        <p className="text-stone-500 text-xs mt-1">Pilih operasi B2B</p>

        {/* Cards */}
        <div className="space-y-4 mt-2">
          {/* Putaway B2B */}
          <button
            onClick={() => router.push("/b2b/putaway")}
            className="w-full bg-white border-2 border-blue-200 rounded-2xl p-6 text-left hover:border-blue-500 active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div>
                <div className="text-stone-900 font-extrabold text-lg">📥 Putaway B2B</div>
                <div className="text-stone-500 text-xs mt-0.5">Scan reference &amp; box masuk gudang</div>
              </div>
            </div>
          </button>

          {/* Loading B2B */}
          <button
            onClick={() => router.push("/b2b/loading")}
            className="w-full bg-white border-2 border-purple-200 rounded-2xl p-6 text-left hover:border-purple-500 active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 18l4-4-4-4m4 8l4-4-4-4" />
                </svg>
              </div>
              <div>
                <div className="text-stone-900 font-extrabold text-lg">🚛 Loading B2B</div>
                <div className="text-stone-500 text-xs mt-0.5">Validasi &amp; handover ke truk</div>
              </div>
            </div>
          </button>

          {/* Manifest B2B */}
          <button
            onClick={() => router.push("/b2b/manifest")}
            className="w-full bg-white border-2 border-emerald-200 rounded-2xl p-6 text-left hover:border-emerald-500 active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-stone-900 font-extrabold text-lg">📋 Manifest B2B</div>
                <div className="text-stone-500 text-xs mt-0.5">Lihat daftar manifest order</div>
              </div>
            </div>
          </button>
        </div>

        <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-10">
          COOL SYSTEM V3 · B2B
        </footer>
      </div>
    </OperatorShell>
  );
}