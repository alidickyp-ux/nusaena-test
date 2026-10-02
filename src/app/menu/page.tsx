"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Building2,
  Package,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Truck,
  Container,
  Scan,
  Handshake,
} from "lucide-react";
import showToast from '@/lib/toast';

export default function MenuPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [showB2C, setShowB2C] = useState(false);
  const [showB2B, setShowB2B] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#0B2B4A] rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const isAdmin = userRole === 'ADMIN';
  const isSecurity = userRole === 'SECURITY';

  // Role badge color
  const getRoleBadge = () => {
    if (isAdmin) return "bg-indigo-100 text-indigo-700 border-indigo-200";
    if (isSecurity) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  // B2C Submenus
  const getB2CSubmenus = () => {
    const allMenus = [
      { id: 'sorting', label: 'Sorting', icon: Scan, path: '/sorting', desc: 'Scan & sortir paket', color: 'blue' },
      { id: 'handover', label: 'Handover', icon: Handshake, path: '/handover', desc: 'Serah terima ke kurir', color: 'orange' },
      { id: 'putaway', label: 'Instan Putaway', icon: Container, path: '/putaway', desc: 'Simpan paket instan ke lokasi rak', color: 'emerald' },
      { id: 'pickup', label: 'Instan Pickup', icon: Truck, path: '/pickup', desc: 'Ambil dari lokasi rak', color: 'violet' },
    ];

    if (isSecurity) {
      return allMenus.filter(menu => menu.id === 'handover' || menu.id === 'pickup');
    }
    return allMenus;
  };

  const b2cMenus = getB2CSubmenus();

  // 🔥 B2B Submenus (Manifest dihilangkan sementara)
  const getB2BSubmenus = () => {
    return [
      { id: 'putaway', label: 'Putaway', icon: Container, path: '/b2b/putaway', desc: 'Scan reference & box masuk gudang', color: 'blue' },
      { id: 'loading', label: 'Loading', icon: Truck, path: '/b2b/loading', desc: 'Validasi & handover ke truk', color: 'orange' },
    ];
  };

  const b2bMenus = getB2BSubmenus();

  // Helper warna icon
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    orange: { bg: "bg-orange-100", text: "text-orange-600" },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
    violet: { bg: "bg-violet-100", text: "text-violet-600" },
    indigo: { bg: "bg-indigo-100", text: "text-indigo-600" },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto">
      
      {/* 🔥 HEADER dengan gradient navy */}
        <div className="bg-gradient-to-br from-[#0B2B4A] to-[#1a3d5c] px-5 pt-6 pb-8 rounded-b-3xl shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              {/* 🔥 Logo Favicon */}
              <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden p-1">
                <img
                  src="/favicon.ico"
                  alt="Nusaena"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <p className="text-[0.65rem] text-white/70 font-mono font-bold uppercase tracking-widest">
                  ONLINE · NUSAENA
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>

          <div>
            <p className="text-white/60 text-xs font-medium mb-1">Selamat datang,</p>
            <p className="text-white font-bold text-xl leading-tight">{fullName}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadge()}`}>
                {userRole}
              </span>
            </div>
          </div>
        </div>

     
      {/* 🔥 CONTENT */}
      <div className="flex-1 px-5 py-6 -mt-4 space-y-4">
        
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest px-1">
          Menu Operasi
        </p>

        {/* 🔥 B2B CARD - Collapsible */}
        {!isSecurity && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <button
              onClick={() => setShowB2B(!showB2B)}
              className="w-full p-5 text-left flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-900 font-bold text-base">B2B</div>
                <div className="text-slate-500 text-xs mt-0.5">Putaway & Loading gudang</div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
                  showB2B ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Submenu B2B */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                showB2B ? "max-h-96" : "max-h-0"
              }`}
            >
              <div className="px-3 pb-3 space-y-1.5 border-t border-slate-100 pt-3">
                {b2bMenus.map((menu) => {
                  const Icon = menu.icon;
                  const colors = colorMap[menu.color];
                  return (
                    <button
                      key={menu.id}
                      onClick={() => router.push(menu.path)}
                      className="w-full flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl hover:bg-slate-100 transition-colors active:scale-[0.98]"
                    >
                      <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${colors.text}`} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold text-slate-800">{menu.label}</p>
                        <p className="text-[10px] text-slate-500 truncate">{menu.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 🔥 B2C CARD - Collapsible */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button
            onClick={() => setShowB2C(!showB2C)}
            className="w-full p-5 text-left flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-500/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-900 font-bold text-base">B2C</div>
              <div className="text-slate-500 text-xs mt-0.5">Sorting & Handover paket retail</div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
                showB2C ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Submenu B2C */}
          <div
            className={`overflow-hidden transition-all duration-300 ${
              showB2C ? "max-h-96" : "max-h-0"
            }`}
          >
            <div className="px-3 pb-3 space-y-1.5 border-t border-slate-100 pt-3">
              {b2cMenus.map((menu) => {
                const Icon = menu.icon;
                const colors = colorMap[menu.color];
                return (
                  <button
                    key={menu.id}
                    onClick={() => router.push(menu.path)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl hover:bg-slate-100 transition-colors active:scale-[0.98]"
                  >
                    <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-bold text-slate-800">{menu.label}</p>
                      <p className="text-[10px] text-slate-500 truncate">{menu.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 🔥 ADMIN DASHBOARD */}
        {isAdmin && (
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="w-full bg-white rounded-2xl p-5 text-left shadow-sm hover:shadow-md border border-slate-100 hover:border-indigo-200 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-900 font-bold text-base">Admin Dashboard</div>
                <div className="text-slate-500 text-xs mt-0.5">Kelola user dan monitoring</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
            </div>
          </button>
        )}
      </div>

      <footer className="text-center text-[10px] text-slate-400 font-mono font-semibold py-6">
        NUSAENA V1 · WMS
      </footer>
    </div>
  );
}