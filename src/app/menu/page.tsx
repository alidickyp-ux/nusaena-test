"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Building2,
  Package,
  ShieldCheck,
  ChevronRight,
  Truck,
  Container,
  Scan,
  Handshake,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import LiveClock from "@/components/LiveClock";
import showToast from "@/lib/toast";

// =====================================================================
// TYPES
// =====================================================================
type TabKey = "b2c" | "b2b";

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  desc: string;
  gradient: string;
  shadow: string;
  badgeStyle: string;
  badgeUnit?: string;
}

type PendingMap = Record<string, number>;

const LAST_TAB_KEY = "nusaena:menu:tab";

// =====================================================================
// MENU DATA
// =====================================================================
const B2C_MENUS: MenuItem[] = [
  {
    id: "b2c-sorting",
    label: "Sorting",
    icon: Scan,
    path: "/sorting",
    desc: "Scan dan sortir paket",
    gradient: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/25",
    badgeStyle: "bg-blue-100 text-blue-800",
  },
  {
    id: "b2c-handover",
    label: "Handover",
    icon: Handshake,
    path: "/handover",
    desc: "Serah terima ke kurir",
    gradient: "from-orange-500 to-orange-600",
    shadow: "shadow-orange-500/25",
    badgeStyle: "bg-amber-100 text-amber-800",
  },
  {
    id: "b2c-putaway",
    label: "Instan Putaway",
    icon: Container,
    path: "/putaway",
    desc: "Simpan paket ke rak",
    gradient: "from-emerald-500 to-emerald-600",
    shadow: "shadow-emerald-500/25",
    badgeStyle: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "b2c-pickup",
    label: "Instan Pickup",
    icon: Truck,
    path: "/pickup",
    desc: "Ambil paket dari rak",
    gradient: "from-violet-500 to-violet-600",
    shadow: "shadow-violet-500/25",
    badgeStyle: "bg-violet-100 text-violet-800",
  },
];

const B2B_MENUS: MenuItem[] = [
  {
    id: "b2b-putaway",
    label: "Putaway",
    icon: Container,
    path: "/b2b/putaway",
    desc: "Scan reference dan box masuk",
    gradient: "from-cyan-500 to-blue-600",
    shadow: "shadow-cyan-500/25",
    badgeStyle: "bg-cyan-100 text-cyan-800",
  },
  {
    id: "b2b-loading",
    label: "Loading",
    icon: Truck,
    path: "/b2b/loading",
    desc: "Validasi dan handover ke truk",
    gradient: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/25",
    badgeStyle: "bg-blue-100 text-blue-800",
    badgeUnit: "truk",
  },
];

const SECURITY_ALLOWED = new Set(["b2c-handover", "b2c-pickup"]);

// =====================================================================
// HELPERS
// =====================================================================
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage penuh / diblokir — abaikan */
  }
}

// =====================================================================
// PAGE
// =====================================================================
export default function MenuPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("b2c");
  const [pending, setPending] = useState<PendingMap>({});
  const [isOnline, setIsOnline] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [slideFrom, setSlideFrom] = useState<"left" | "right">("right");

  // ---- Load user ----
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

  // ---- Preferensi tab terakhir ----
  useEffect(() => {
    const savedTab = readStorage(LAST_TAB_KEY);
    if (savedTab === "b2c" || savedTab === "b2b") setTab(savedTab);
  }, []);

  // ---- Jumlah antrian (opsional) ----
  useEffect(() => {
    let cancelled = false;
    const loadPending = async () => {
      try {
        const res = await fetch("/api/menu/summary");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.pending) setPending(data.pending);
      } catch {
        /* abaikan */
      }
    };
    loadPending();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Status koneksi ----
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const isAdmin = userRole === "ADMIN";
  const isSecurity = userRole === "SECURITY";

  const b2cMenus = useMemo(
    () =>
      isSecurity
        ? B2C_MENUS.filter((m) => SECURITY_ALLOWED.has(m.id))
        : B2C_MENUS,
    [isSecurity]
  );
  const b2bMenus = isSecurity ? [] : B2B_MENUS;
  const hasB2B = b2bMenus.length > 0;

  const activeTab: TabKey = hasB2B ? tab : "b2c";
  const activeMenus = activeTab === "b2c" ? b2cMenus : b2bMenus;

  const openMenu = useCallback(
    (item: MenuItem) => {
      router.push(item.path);
    },
    [router]
  );

  const changeTab = (next: TabKey) => {
    if (next === activeTab) return;

    // Arah slide: B2C -> B2B = geser kanan, sebaliknya = kiri
    const order: TabKey[] = ["b2c", "b2b"];
    const currentIdx = order.indexOf(activeTab);
    const nextIdx = order.indexOf(next);
    setSlideFrom(nextIdx > currentIdx ? "right" : "left");

    setTab(next);
    writeStorage(LAST_TAB_KEY, next);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        showToast.success("Berhasil logout");
        router.push("/login");
        return;
      }
      showToast.error("Gagal logout");
    } catch {
      showToast.error("Gagal logout");
    } finally {
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0B2B4A] rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
            Loading
          </p>
        </div>
      </div>
    );
  }

  const getRoleStyle = () => {
    if (isAdmin) return "bg-indigo-500/25 text-indigo-100 border-indigo-300/35";
    if (isSecurity)
      return "bg-emerald-500/25 text-emerald-100 border-emerald-300/35";
    return "bg-blue-500/25 text-blue-100 border-blue-300/35";
  };

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col max-w-md mx-auto">
      {/* ============================================================= */}
      {/* HEADER                                                         */}
      {/* ============================================================= */}
      <header className="bg-gradient-to-br from-[#0B2B4A] via-[#0f3558] to-[#1a3d5c] px-5 pt-5 pb-14 text-white relative overflow-hidden">
        {/* Decorative blur */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo favicon */}
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/95 border border-white/30 flex items-center justify-center overflow-hidden shadow-lg">
              <img
                src="/favicon.ico"
                alt="Nusaena"
                className="w-9 h-9 object-contain"
              />
            </div>

            <div className="min-w-0">
              <p className="text-base font-bold leading-tight truncate">
                {fullName || "User"}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getRoleStyle()}`}
                >
                  {userRole}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-white/70">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      isOnline ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  {isOnline ? "Terhubung" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-lg font-bold leading-tight tabular-nums">
              <LiveClock />
            </div>
            <p className="text-[11px] text-white/60 mt-0.5">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        </div>
      </header>

      {/* ============================================================= */}
      {/* CONTENT                                                        */}
      {/* ============================================================= */}
      <main className="flex-1 px-4 pb-6 -mt-8 space-y-3.5">
        {/* Offline notice */}
        {!isOnline && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900"
          >
            <WifiOff className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs leading-snug">
              Koneksi terputus. Scan baru mungkin belum tersimpan ke server.
              Sambungkan kembali sebelum melanjutkan.
            </p>
          </div>
        )}

        {/* Tab B2C / B2B */}
        {hasB2B && (
          <div
            role="tablist"
            aria-label="Kategori menu"
            className="relative flex rounded-2xl bg-slate-200 p-1"
          >
            {/* Sliding indicator */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-transform duration-300 ease-out ${
                activeTab === "b2c"
                  ? "translate-x-0"
                  : "translate-x-[calc(100%+4px)]"
              }`}
              aria-hidden="true"
            />

            <TabButton
              active={activeTab === "b2c"}
              icon={Package}
              label="B2C"
              onClick={() => changeTab("b2c")}
            />
            <TabButton
              active={activeTab === "b2b"}
              icon={Building2}
              label="B2B"
              onClick={() => changeTab("b2b")}
            />
          </div>
        )}

        {/* Grid menu dengan animasi slide */}
        <div
          key={activeTab}
          role="tabpanel"
          className={`grid grid-cols-2 gap-2.5 animate-in fade-in duration-300 ease-out ${
            slideFrom === "right"
              ? "slide-in-from-right-6"
              : "slide-in-from-left-6"
          }`}
        >
          {activeMenus.map((menu) => (
            <MenuTile
              key={menu.id}
              item={menu}
              count={pending[menu.id] ?? 0}
              onClick={() => openMenu(menu)}
            />
          ))}
        </div>

        {/* Admin */}
        {isAdmin && (
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="group w-full flex items-center gap-3 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 px-3.5 py-3 text-left active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">
                Admin Dashboard
              </p>
              <p className="text-[11px] text-slate-500">
                Kelola user dan pantau sistem
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
          </button>
        )}

        {/* Logout */}
        <button
          onClick={() => setConfirmLogout(true)}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-sm text-slate-500 hover:text-slate-700 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-xl"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </main>

      <footer className="text-center text-[11px] text-slate-400 font-mono font-semibold py-5 tracking-widest">
        NUSAENA V1 · WMS
      </footer>

      {/* ============================================================= */}
      {/* KONFIRMASI LOGOUT                                              */}
      {/* ============================================================= */}
      {confirmLogout && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
          onClick={() => !loggingOut && setConfirmLogout(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="logout-title"
              className="text-base font-bold text-slate-900"
            >
              Keluar dari akun?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Anda perlu login lagi untuk melanjutkan pekerjaan.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setConfirmLogout(false)}
                disabled={loggingOut}
                className="rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 active:scale-[0.97] transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-xl bg-red-600 py-3 text-sm font-semibold text-white active:scale-[0.97] transition disabled:opacity-60"
              >
                {loggingOut ? "Keluar…" : "Keluar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// COMPONENTS
// =====================================================================
function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B4A] ${
        active ? "text-[#0B2B4A]" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      <Icon
        className={`w-4 h-4 transition-transform duration-300 ${
          active ? "scale-110" : "scale-100"
        }`}
      />
      {label}
    </button>
  );
}

function MenuTile({
  item,
  count,
  onClick,
}: {
  item: MenuItem;
  count: number;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className="relative min-h-[118px] rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md p-3.5 text-left active:scale-[0.97] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B4A]"
    >
      {count > 0 && (
        <span
          className={`absolute top-3 right-3 text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeStyle}`}
        >
          {count}
          {item.badgeUnit ? ` ${item.badgeUnit}` : ""}
        </span>
      )}

      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-2.5 shadow-md ${item.shadow}`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      <p className="text-[13px] font-bold leading-tight text-slate-900">
        {item.label}
      </p>
      <p className="text-[11px] mt-0.5 leading-snug text-slate-500 line-clamp-2">
        {item.desc}
      </p>
    </button>
  );
}