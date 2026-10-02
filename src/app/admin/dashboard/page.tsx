"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Handshake,
  History,
  Clock,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Box,
  XCircle,
  Zap,
  ArrowRight,
  Activity,
  Scan,
  ClipboardList,
  FileText,
  AlertTriangle,
  Sun,
  Moon,
  Sunset,
} from "lucide-react";
import showToast from '@/lib/toast';

interface DashboardStats {
  total_sessions: number;
  active_sessions: number;
  total_handovers: number;
  total_history: number;
  today_sessions: number;
  today_handovers: number;
  total_discrepancy: number;
  total_packages: number;
  validated_packages: number;
  pending_packages: number;
}

interface RecentActivity {
  type: string;
  id: string;
  created_at: string;
  session_code: string;
  transporter_name: string;
  courier_name: string;
  total_items: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard/stats", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentActivity(data.recentActivity || []);
        setLastUpdate(new Date().toLocaleTimeString('id-ID'));
      } else {
        showToast.error("Gagal memuat data dashboard");
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      showToast.error("Error loading dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString('id-ID'));
    fetchDashboard();

    const interval = setInterval(() => {
      fetchDashboard();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    showToast.success("✅ Data dashboard diperbarui");
  };

  const formatNumber = (num: number) => num.toLocaleString('id-ID');

  // 🔥 Sapaan berbasis waktu
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return { text: "Selamat Pagi", icon: Sun, emoji: "☀️" };
    if (hour < 15) return { text: "Selamat Siang", icon: Sun, emoji: "🌤️" };
    if (hour < 19) return { text: "Selamat Sore", icon: Sunset, emoji: "🌇" };
    return { text: "Selamat Malam", icon: Moon, emoji: "🌙" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0B2B4A] rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm mt-4 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-slate-700 font-medium mb-1">Gagal memuat data dashboard</p>
          <p className="text-xs text-slate-400 mb-4">Silakan coba lagi</p>
          <button
            onClick={fetchDashboard}
            className="px-5 py-2.5 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white rounded-xl text-sm font-bold transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // 🔥 Hitung persentase untuk progress bar
  const validatedPct = stats.total_packages > 0
    ? Math.round((stats.validated_packages / stats.total_packages) * 100)
    : 0;
  const pendingPct = stats.total_packages > 0
    ? Math.round((stats.pending_packages / stats.total_packages) * 100)
    : 0;
  const discrepancyPct = stats.total_packages > 0
    ? Math.round((stats.total_discrepancy / stats.total_packages) * 100)
    : 0;

  // 🔥 Cek apakah ada discrepancy yang perlu perhatian
  const hasHighDiscrepancy = stats.total_discrepancy > 0 && discrepancyPct >= 5;

  return (
    <div className="space-y-5">

      {/* ============================================================
          HERO STRIP — Greeting + Live + Refresh
      ============================================================ */}
      <div className="bg-gradient-to-br from-[#0B2B4A] via-[#0f3357] to-[#1a3d5c] rounded-2xl p-5 shadow-xl shadow-[#0B2B4A]/20 relative overflow-hidden">
        {/* Decorative blur */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2"></div>

        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0">
              <GreetingIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/60 text-[11px] font-medium uppercase tracking-wider">
                {greeting.emoji} {greeting.text}
              </p>
              <p className="text-white font-bold text-lg leading-tight">
                Handover Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live pulse */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Live</span>
            </div>

            {/* Time */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
              <Clock className="w-3 h-3 text-white/60" />
              <span className="text-[11px] font-medium text-white/80">{lastUpdate || currentTime}</span>
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-colors disabled:opacity-50 border border-white/10"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          ANOMALY ALERT — Muncul jika discrepancy tinggi
      ============================================================ */}
      {hasHighDiscrepancy && (
        <div className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-rose-800">
              Perhatian: Discrepancy {discrepancyPct}%
            </p>
            <p className="text-xs text-rose-600 mt-0.5">
              {formatNumber(stats.total_discrepancy)} paket bermasalah dari {formatNumber(stats.total_packages)} total paket. Segera periksa.
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/b2c')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 flex-shrink-0"
          >
            Periksa <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ============================================================
          ASYMMETRIC STATS — 1 Hero + 3 Support
      ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Hero Card — Active Sessions */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#E87A2A] to-[#f59e0b] flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full uppercase tracking-wider">
                Sedang Berjalan
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Active Sessions
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-extrabold text-slate-900 leading-none">
                {formatNumber(stats.active_sessions)}
              </p>
              <p className="text-sm text-slate-400 font-medium">sesi</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Hari ini</span>
              <span className="text-[11px] font-bold text-orange-600">
                +{stats.today_sessions} sesi
              </span>
            </div>
          </div>
        </div>

        {/* Support Cards Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: 'Total Sessions',
              value: stats.total_sessions,
              icon: Package,
              color: 'from-[#0B2B4A] to-[#1a3d5c]',
              shadow: 'shadow-[#0B2B4A]/20',
              subtitle: 'Sepanjang waktu',
            },
            {
              title: 'Handovers',
              value: stats.total_handovers,
              icon: Handshake,
              color: 'from-emerald-500 to-emerald-600',
              shadow: 'shadow-emerald-500/20',
              subtitle: `+${stats.today_handovers} hari ini`,
            },
            {
              title: 'History Logs',
              value: stats.total_history,
              icon: History,
              color: 'from-slate-600 to-slate-700',
              shadow: 'shadow-slate-500/20',
              subtitle: `${formatNumber(stats.total_discrepancy)} discrepancy`,
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                onClick={() => showToast.info(`📊 ${stat.title}: ${stat.value}`)}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-lg ${stat.shadow}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-extrabold text-slate-900 leading-none">
                  {formatNumber(stat.value)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1.5">{stat.subtitle}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          PACKAGE FLOW — Progress bars instead of flat boxes
      ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Box className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Package Flow</h3>
              <p className="text-[10px] text-slate-400">
                {formatNumber(stats.total_packages)} total paket
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-wider">
            Real-time
          </span>
        </div>

        <div className="space-y-3">
          {/* Validated */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-slate-600">Validated</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-extrabold text-emerald-600">
                  {formatNumber(stats.validated_packages)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{validatedPct}%</span>
              </div>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${validatedPct}%` }}
              />
            </div>
          </div>

          {/* Pending */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-bold text-slate-600">Pending</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-extrabold text-amber-600">
                  {formatNumber(stats.pending_packages)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{pendingPct}%</span>
              </div>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${pendingPct}%` }}
              />
            </div>
          </div>

          {/* Discrepancy */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-xs font-bold text-slate-600">Discrepancy</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-extrabold text-rose-600">
                  {formatNumber(stats.total_discrepancy)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{discrepancyPct}%</span>
              </div>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${discrepancyPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          QUICK ACCESS — Icon tiles
      ============================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Quick Access
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Sorting', icon: Scan, path: '/sorting', color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
            { label: 'Handover', icon: Handshake, path: '/handover', color: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/20' },
            { label: 'Manifest', icon: FileText, path: '/admin/manifest', color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
            { label: 'History', icon: History, path: '/admin/history', color: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/20' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => router.push(action.path)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-lg ${action.shadow} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-bold text-slate-700">{action.label}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 group-hover:text-slate-600 transition-colors">
                  Buka <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          RECENT ACTIVITY — Timeline
      ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Recent Activity</h3>
              <p className="text-[10px] text-slate-400">{recentActivity.length} aktivitas terbaru</p>
            </div>
          </div>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Belum ada aktivitas</p>
            <p className="text-xs text-slate-400 mt-1">Aktivitas akan muncul di sini</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200"></div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {recentActivity.map((activity, index) => {
                const isHandover = activity.type === 'handover';
                return (
                  <div key={activity.id || index} className="flex items-start gap-3 relative">
                    {/* Timeline dot */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-4 border-white ${
                      isHandover ? 'bg-emerald-100' : 'bg-blue-100'
                    }`}>
                      {isHandover ? (
                        <Handshake className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Package className="w-4 h-4 text-blue-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 bg-slate-50 hover:bg-slate-100 rounded-xl p-3 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-700 truncate">
                            {isHandover ? 'Handover' : 'Sorting'} · {activity.session_code}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {activity.transporter_name}
                          </p>
                          {activity.courier_name && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              Kurir: {activity.courier_name}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isHandover
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {activity.total_items || 0} pcs
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">
                            {activity.created_at
                              ? new Date(activity.created_at).toLocaleString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: 'short'
                                })
                              : '-'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pt-2">
        <p className="text-[10px] text-slate-400 font-mono">
          nusaena v1 · Auto-refresh every 5s
        </p>
      </div>
    </div>
  );
}