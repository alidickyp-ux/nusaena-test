"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Package, 
  Handshake, 
  History, 
  Clock,
  CheckCircle,
  RefreshCw,
  Box,
  Search,
  Building2,
  Truck,
  Activity,
  FileText,
  Warehouse,
  AlertCircle
} from "lucide-react";
import { toast } from "@/lib/toast";

// =============================================
// TYPES
// =============================================
interface B2CStats {
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

interface InstantStats {
  total_instant: number;
  stored_packages: number;
  picked_packages: number;
  completed_packages: number;
  today_putaway: number;
  today_picked: number;
  is_available: boolean;
}

interface B2BStats {
  total_b2b_box: number;
  staging_box: number;
  loaded_box: number;
  today_b2b_putaway: number;
  today_b2b_loading: number;
  total_references: number;
  total_vendors: number;
  total_sites: number;
  total_weight: number;
  total_volume: number;
  is_available: boolean;
}

interface RecentActivity {
  type: string;
  id: string;
  created_at: string;
  code: string;
  name: string;
  detail: string;
  total_items: number;
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function AdminDashboardPage() {
  const [b2cStats, setB2cStats] = useState<B2CStats | null>(null);
  const [instantStats, setInstantStats] = useState<InstantStats | null>(null);
  const [b2bStats, setB2bStats] = useState<B2BStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"all" | "b2c" | "instant" | "b2b">("all");

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
        setB2cStats(data.stats?.b2c || null);
        setInstantStats(data.stats?.instant || null);
        setB2bStats(data.stats?.b2b || null);
        setRecentActivity(data.recentActivity || []);
        setLastUpdate(new Date().toLocaleTimeString('id-ID'));
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    toast.success("✅ Data diperbarui");
  };

  const formatNumber = (num: number | string | null | undefined) => {
    const n = typeof num === 'string' ? parseFloat(num) : (num || 0);
    return n.toLocaleString('id-ID');
  };

  const formatWeight = (num: number | string | null | undefined) => {
    const n = typeof num === 'string' ? parseFloat(num) : (num || 0);
    return n.toFixed(2);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview semua operasi warehouse
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            {lastUpdate}
          </span>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="flex flex-wrap gap-2">
        <TabButton 
          active={activeTab === "all"} 
          onClick={() => setActiveTab("all")}
          label="Semua"
        />
        <TabButton 
          active={activeTab === "b2c"} 
          onClick={() => setActiveTab("b2c")}
          label="📦 B2C"
        />
        <TabButton 
          active={activeTab === "instant"} 
          onClick={() => setActiveTab("instant")}
          label="⚡ Instant"
          disabled={!instantStats?.is_available}
        />
        <TabButton 
          active={activeTab === "b2b"} 
          onClick={() => setActiveTab("b2b")}
          label="🏢 B2B"
          disabled={!b2bStats?.is_available}
        />
      </div>

      {/* ============================================= */}
      {/* B2C FLOW */}
      {/* ============================================= */}
      {(activeTab === "all" || activeTab === "b2c") && (
        <SectionCard
          icon={<Package className="w-4 h-4 text-orange-600" />}
          iconBg="bg-orange-100"
          title="B2C Flow"
          subtitle="Sorting & Handover"
          badge="Active"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Total Sessions"
              value={b2cStats?.total_sessions || 0}
              subtitle={`${b2cStats?.active_sessions || 0} aktif · ${b2cStats?.today_sessions || 0} hari ini`}
              icon={Package}
              color="bg-[#0B2B4A]"
            />
            <StatCard
              title="Handovers"
              value={b2cStats?.total_handovers || 0}
              subtitle={`${b2cStats?.today_handovers || 0} hari ini`}
              icon={Handshake}
              color="bg-[#1a7a5a]"
            />
            <StatCard
              title="Total Paket"
              value={b2cStats?.total_packages || 0}
              subtitle={`${b2cStats?.validated_packages || 0} validated · ${b2cStats?.pending_packages || 0} pending`}
              icon={Box}
              color="bg-[#E87A2A]"
            />
            <StatCard
              title="Discrepancy"
              value={b2cStats?.total_discrepancy || 0}
              subtitle={`${b2cStats?.total_history || 0} total history`}
              icon={AlertCircle}
              color="bg-[#dc2626]"
            />
          </div>
        </SectionCard>
      )}

      {/* ============================================= */}
      {/* INSTANT FLOW */}
      {/* ============================================= */}
      {(activeTab === "all" || activeTab === "instant") && instantStats?.is_available && (
        <SectionCard
          icon={<Box className="w-4 h-4 text-blue-600" />}
          iconBg="bg-blue-100"
          title="Instant Flow"
          subtitle="Putaway & Pickup"
          badge="Active"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Total Instant"
              value={instantStats?.total_instant || 0}
              subtitle={`${instantStats?.today_putaway || 0} putaway hari ini`}
              icon={Package}
              color="bg-[#1e40af]"
            />
            <StatCard
              title="Stored"
              value={instantStats?.stored_packages || 0}
              subtitle="Siap pickup"
              icon={Warehouse}
              color="bg-[#0e7490]"
            />
            <StatCard
              title="Picked"
              value={instantStats?.picked_packages || 0}
              subtitle={`${instantStats?.today_picked || 0} hari ini`}
              icon={Search}
              color="bg-[#7e22ce]"
            />
            <StatCard
              title="Completed"
              value={instantStats?.completed_packages || 0}
              subtitle="Selesai"
              icon={CheckCircle}
              color="bg-[#166534]"
            />
          </div>
        </SectionCard>
      )}

      {/* ============================================= */}
      {/* B2B FLOW */}
      {/* ============================================= */}
      {(activeTab === "all" || activeTab === "b2b") && b2bStats?.is_available && (
        <SectionCard
          icon={<Building2 className="w-4 h-4 text-purple-600" />}
          iconBg="bg-purple-100"
          title="B2B Flow"
          subtitle="Putaway & Loading"
          badge="Active"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Total Box"
              value={b2bStats?.total_b2b_box || 0}
              subtitle={`${b2bStats?.today_b2b_putaway || 0} putaway hari ini`}
              icon={Package}
              color="bg-[#6d28d9]"
            />
            <StatCard
              title="Staging"
              value={b2bStats?.staging_box || 0}
              subtitle="Belum loading"
              icon={Clock}
              color="bg-[#c2410c]"
            />
            <StatCard
              title="Loaded"
              value={b2bStats?.loaded_box || 0}
              subtitle={`${b2bStats?.today_b2b_loading || 0} hari ini`}
              icon={Truck}
              color="bg-[#065f46]"
            />
            <StatCard
              title="References"
              value={b2bStats?.total_references || 0}
              subtitle={`${b2bStats?.total_vendors || 0} vendor · ${b2bStats?.total_sites || 0} site`}
              icon={FileText}
              color="bg-[#0B2B4A]"
            />
          </div>
          
          {/* Mini Stats B2B */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <MiniStat 
              label="Total Weight" 
              value={`${formatWeight(b2bStats?.total_weight)} kg`} 
              color="text-purple-600" 
              bg="bg-purple-50" 
            />
            <MiniStat 
              label="Total Volume" 
              value={`${formatWeight(b2bStats?.total_volume)} m³`} 
              color="text-indigo-600" 
              bg="bg-indigo-50" 
            />
            <MiniStat 
              label="Vendors" 
              value={formatNumber(b2bStats?.total_vendors)} 
              color="text-cyan-600" 
              bg="bg-cyan-50" 
            />
            <MiniStat 
              label="Sites" 
              value={formatNumber(b2bStats?.total_sites)} 
              color="text-teal-600" 
              bg="bg-teal-50" 
            />
          </div>
        </SectionCard>
      )}

      {/* ============================================= */}
      {/* B2B NOT AVAILABLE WARNING */}
      {/* ============================================= */}
      {(activeTab === "all" || activeTab === "b2b") && b2bStats && !b2bStats.is_available && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">B2B Module belum aktif</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Tabel <code className="bg-amber-100 px-1 rounded">b2b_putaway</code> belum tersedia di database.
            </p>
          </div>
        </div>
      )}

      {/* ============================================= */}
      {/* RECENT ACTIVITY */}
      {/* ============================================= */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0B2B4A]" />
            Recent Activity
          </h3>
          <span className="text-xs text-slate-400">{recentActivity.length} terbaru</span>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Belum ada aktivitas
            </div>
          ) : (
            recentActivity.map((activity, index) => {
              const iconConfig = getActivityIcon(activity.type);
              return (
                <div 
                  key={`${activity.id}-${index}`}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconConfig.bg}`}>
                    {iconConfig.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {iconConfig.label} <span className="font-mono">{activity.code}</span>
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {activity.name} 
                      {activity.detail && ` · ${activity.detail}`}
                      {activity.type !== 'b2b_loading' && ` · ${activity.total_items} item`}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
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
  );
}

// =============================================
// COMPONENTS
// =============================================

function TabButton({ active, onClick, label, disabled }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition-all
        ${active 
          ? 'bg-[#0B2B4A] text-white shadow-lg shadow-[#0B2B4A]/20' 
          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        }
        ${disabled && 'opacity-40 cursor-not-allowed'}
      `}
    >
      {label}
    </button>
  );
}

function SectionCard({ icon, iconBg, title, subtitle, badge, children }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 ${iconBg} rounded flex items-center justify-center`}>
          {icon}
        </div>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          {title}
        </h2>
        <span className="text-xs text-slate-400">{subtitle}</span>
        {badge && (
          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold uppercase">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className={`${color} rounded-xl p-4 shadow-lg shadow-slate-200/50 hover:scale-[1.02] transition-transform`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-white/70 font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {(value || 0).toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-white/50 mt-1 truncate">{subtitle}</p>
        </div>
        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color, bg }: any) {
  return (
    <div className={`${bg} rounded-lg p-3`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-base font-bold ${color} truncate`}>{value}</p>
    </div>
  );
}

// =============================================
// HELPER
// =============================================
function getActivityIcon(type: string) {
  switch (type) {
    case 'handover':
      return {
        icon: <Handshake className="w-4 h-4 text-emerald-600" />,
        bg: 'bg-emerald-100',
        label: 'Handover',
      };
    case 'b2b_loading':
      return {
        icon: <Truck className="w-4 h-4 text-blue-600" />,
        bg: 'bg-blue-100',
        label: 'B2B Loading',
      };
    case 'instant_pickup':
      return {
        icon: <Search className="w-4 h-4 text-purple-600" />,
        bg: 'bg-purple-100',
        label: 'Pickup',
      };
    default:
      return {
        icon: <Activity className="w-4 h-4 text-slate-600" />,
        bg: 'bg-slate-100',
        label: 'Activity',
      };
  }
}