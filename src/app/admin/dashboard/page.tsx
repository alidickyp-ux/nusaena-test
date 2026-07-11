"use client";

import { useEffect, useState } from "react";
import { 
  Package, 
  Handshake, 
  History, 
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  totalHandovers: number;
  totalHistory: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    activeSessions: 0,
    totalHandovers: 0,
    totalHistory: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    // Set current time hanya di client
    setCurrentTime(new Date().toLocaleTimeString());
    
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        // Nanti akan diganti dengan API call
        // const res = await fetch('/api/admin/stats');
        // const data = await res.json();
        // setStats(data);
        
        // Mock data dulu
        setStats({
          totalSessions: 156,
          activeSessions: 12,
          totalHandovers: 89,
          totalHistory: 1024
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Sessions',
      value: stats.totalSessions,
      icon: Package,
      color: 'bg-[#0B2B4A]',
      textColor: 'text-white'
    },
    {
      title: 'Active Sessions',
      value: stats.activeSessions,
      icon: Clock,
      color: 'bg-[#E87A2A]',
      textColor: 'text-white'
    },
    {
      title: 'Handovers',
      value: stats.totalHandovers,
      icon: Handshake,
      color: 'bg-[#1a7a5a]',
      textColor: 'text-white'
    },
    {
      title: 'History Logs',
      value: stats.totalHistory,
      icon: History,
      color: 'bg-[#5a6a7a]',
      textColor: 'text-white'
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
          <span className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            Last updated: {currentTime || 'Loading...'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`${stat.color} rounded-xl p-5 shadow-lg shadow-slate-200/50`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/70 font-medium">{stat.title}</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-white/20 rounded animate-pulse mt-1"></div>
                  ) : (
                    <p className="text-3xl font-bold text-white mt-1">{stat.value.toLocaleString()}</p>
                  )}
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#0B2B4A]" />
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-700 transition-colors">
              📦 Create New Sorting Session
            </button>
            <button className="w-full text-left px-4 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-700 transition-colors">
              📋 View Pending Handovers
            </button>
            <button className="w-full text-left px-4 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-700 transition-colors">
              📊 Generate Report
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0B2B4A]" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-[#0B2B4A]/10 flex items-center justify-center">
                  {i % 2 === 0 ? (
                    <CheckCircle className="w-4 h-4 text-[#1a7a5a]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#E87A2A]" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">
                    {i % 2 === 0 ? 'Handover completed' : 'New sorting session created'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {i} hours ago • Session #{1000 + i}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}