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

  // Role-based flags
  const isAdmin = userRole === 'ADMIN';
  const isOperator = userRole === 'OPERATOR';
  const isSecurity = userRole === 'SECURITY';

  // Definisikan submenu B2C yang tersedia untuk setiap role
  const getB2CSubmenus = () => {
    const allMenus = [
      { id: 'sorting', label: 'Sorting', icon: '📦', path: '/sorting', desc: 'Scan & sortir paket' },
      { id: 'handover', label: 'Handover', icon: '🤝', path: '/handover', desc: 'Serah terima ke kurir' },
      { id: 'putaway', label: 'Putaway', icon: '📥', path: '/putaway', desc: 'Simpan ke lokasi rak' },
      { id: 'pickup', label: 'Pickup', icon: '🚚', path: '/pickup', desc: 'Ambil dari lokasi rak' },
    ];

    if (isSecurity) {
      // SECURITY hanya boleh melihat Handover dan Pickup
      return allMenus.filter(menu => menu.id === 'handover' || menu.id === 'pickup');
    }
    // ADMIN dan OPERATOR melihat semua
    return allMenus;
  };

  const b2cMenus = getB2CSubmenus();

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

      {/* 🔥 MENU UTAMA */}
      <div className="flex flex-col gap-4">
        {/* B2B - Hanya untuk ADMIN dan OPERATOR, tidak untuk SECURITY */}
        {!isSecurity && (
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
        )}

        {/* 🔥 B2C - Selalu tampil, tetapi submenu disesuaikan */}
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

          {/* 🔥 SUB MENU B2C - Hanya menampilkan menu yang diizinkan */}
          {showB2C && (
            <div className="border-t border-orange-100 p-3 space-y-2 bg-orange-50/30">
              {b2cMenus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => router.push(menu.path)}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-orange-50 transition-colors active:scale-[0.98] border border-stone-100"
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{menu.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-stone-800">{menu.label}</p>
                    <p className="text-[10px] text-stone-400">{menu.desc}</p>
                  </div>
                  <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 🔥 Admin Dashboard - Only for ADMIN */}
        {isAdmin && (
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