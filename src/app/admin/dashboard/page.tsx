"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Package, 
  Handshake, 
  History, 
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  Activity,
  FileText,
  Box,
  XCircle
} from "lucide-react";
import { showToast } from "@/lib/toast";

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // 🔥 Fetch dashboard data
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

  // 🔥 Initial load & realtime polling
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString('id-ID'));
    fetchDashboard();

    // 🔥 Realtime update setiap 5 detik
    const interval = setInterval(() => {
      fetchDashboard();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // 🔥 Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    showToast.success("✅ Data dashboard diperbarui");
  };

  // 🔥 Format angka
  const formatNumber = (num: number) => {
    return num.toLocaleString('id-ID');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0B2B4A] rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Gagal memuat data dashboard</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 px-4 py-2 bg-[#0B2B4A] text-white rounded-lg"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Sessions',
      value: stats.total_sessions,
      icon: Package,
      color: 'bg-[#0B2B4A]',
      subtitle: `${stats.active_sessions} aktif`
    },
    {
      title: 'Active Sessions',
      value: stats.active_sessions,
      icon: Clock,
      color: 'bg-[#E87A2A]',
      subtitle: `${stats.today_sessions} hari ini`
    },
    {
      title: 'Handovers',
      value: stats.total_handovers,
      icon: Handshake,
      color: 'bg-[#1a7a5a]',
      subtitle: `${stats.today_handovers} hari ini`
    },
    {
      title: 'History Logs',
      value: stats.total_history,
      icon: History,
      color: 'bg-[#5a6a7a]',
      subtitle: `${formatNumber(stats.total_discrepancy)} discrepancy`
    },
  ];

  const packageStats = [
    {
      title: 'Total Paket',
      value: stats.total_packages,
      icon: Box,
      color: 'bg-blue-500',
    },
    {
      title: 'Validated',
      value: stats.validated_packages,
      icon: CheckCircle,
      color: 'bg-emerald-500',
    },
    {
      title: 'Pending',
      value: stats.pending_packages,
      icon: Clock,
      color: 'bg-amber-500',
    },
    {
      title: 'Discrepancy',
      value: stats.total_discrepancy,
      icon: XCircle,
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of warehouse operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-emerald-600 font-medium">Live</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            Last updated: {lastUpdate || currentTime}
          </span>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`${stat.color} rounded-xl p-5 shadow-lg shadow-slate-200/50 hover:scale-[1.02] transition-transform cursor-pointer`}
              onClick={() => showToast.info(`📊 ${stat.title}: ${stat.value}`)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/70 font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-white mt-1">{formatNumber(stat.value)}</p>
                  <p className="text-xs text-white/50 mt-1">{stat.subtitle}</p>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Package Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {packageStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`${stat.color} rounded-xl p-4 shadow-sm text-white`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-white/70" />
                <div>
                  <p className="text-xs text-white/70">{stat.title}</p>
                  <p className="text-xl font-bold">{formatNumber(stat.value)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Access & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#0B2B4A]" />
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.href = '/sorting'}
              className="w-full text-left px-4 py-2.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 rounded-lg text-sm text-slate-700 transition-colors border border-transparent"
            >
              📦 Sorting
            </button>
            <button 
              onClick={() => window.location.href = '/handover'}
              className="w-full text-left px-4 py-2.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 rounded-lg text-sm text-slate-700 transition-colors border border-transparent"
            >
              🤝 Handover
            </button>
            <button 
              onClick={() => window.location.href = '/admin/manifest'}
              className="w-full text-left px-4 py-2.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 rounded-lg text-sm text-slate-700 transition-colors border border-transparent"
            >
              📄 Manifest
            </button>
            <button 
              onClick={() => window.location.href = '/admin/history'}
              className="w-full text-left px-4 py-2.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 rounded-lg text-sm text-slate-700 transition-colors border border-transparent"
            >
              📜 History Logs
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0B2B4A]" />
              Recent Activity
            </h3>
            <span className="text-xs text-slate-400">{recentActivity.length} terbaru</span>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Belum ada aktivitas
              </div>
            ) : (
              recentActivity.map((activity, index) => {
                const isHandover = activity.type === 'handover';
                return (
                  <div 
                    key={activity.id || index} 
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isHandover ? 'bg-emerald-100' : 'bg-blue-100'
                    }`}>
                      {isHandover ? (
                        <Handshake className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Package className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {isHandover ? 'Handover' : 'Sorting'} {activity.session_code}
                      </p>
                      <p className="text-xs text-slate-500">
                        {activity.transporter_name} · {activity.courier_name || activity.total_items || 0} paket
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {activity.created_at 
                        ? new Date(activity.created_at).toLocaleString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: 'short'
                          })
                        : '-'
                      }
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-[#0B2B4A]/5 border border-[#0B2B4A]/10 rounded-xl p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#0B2B4A] rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">i</span>
        </div>
        <div>
          <p className="text-sm text-slate-700">
            <span className="font-semibold">📊 Real-time Dashboard:</span> Data diperbarui otomatis setiap 5 detik.
            Total {formatNumber(stats.total_packages)} paket dari {formatNumber(stats.total_sessions)} session.
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {stats.active_sessions} session aktif · {stats.today_handovers} handover hari ini · {formatNumber(stats.total_discrepancy)} discrepancy total
          </p>
        </div>
      </div>
    </div>
  );
}