"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  LogOut,
  Users,
  ChevronDown,
  Menu,
  ChevronLeft,
  ChevronRight,
  Shield,
  Truck,
  Store,
  Box,
  Search,
  FileText,
  Monitor,
  HardDrive,
  Activity,
  Layers,
  Database,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  category: 'OPERATION' | 'TOOLS' | 'ADMIN' | 'MASTER';
  disabled?: boolean;
  badge?: string;
}

interface SidebarProps {
  children?: React.ReactNode;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" />, category: 'OPERATION' },
  { name: 'Online Operation', href: '/admin/b2c', icon: <Monitor className="w-[18px] h-[18px]" />, category: 'OPERATION', badge: 'B2C' },
  { name: 'Offline Operation', href: '/admin/b2b/manifest', icon: <HardDrive className="w-[18px] h-[18px]" />, category: 'OPERATION', badge: 'B2B' },
  { name: 'Putaway', href: '/putaway', icon: <Box className="w-[18px] h-[18px]" />, category: 'TOOLS' },
  { name: 'Pickup', href: '/pickup', icon: <Search className="w-[18px] h-[18px]" />, category: 'TOOLS' },
  { name: 'Sorting', href: '/sorting', icon: <Package className="w-[18px] h-[18px]" />, category: 'TOOLS' },
  { name: 'Handover', href: '/handover', icon: <FileText className="w-[18px] h-[18px]" />, category: 'TOOLS' },
  { name: 'User Management', href: '/admin/users', icon: <Users className="w-[18px] h-[18px]" />, category: 'ADMIN' },
  { name: 'Master Ekspedisi', href: '/admin/master/ekspedisi', icon: <Truck className="w-[18px] h-[18px]" />, category: 'MASTER' },
  { name: 'Master Store', href: '/admin/master/store', icon: <Store className="w-[18px] h-[18px]" />, category: 'MASTER' },
];

const categoryConfig = {
  OPERATION: { label: 'Monitoring', icon: <Activity className="w-3.5 h-3.5" /> },
  TOOLS: { label: 'Tools', icon: <Layers className="w-3.5 h-3.5" /> },
  ADMIN: { label: 'Administration', icon: <Shield className="w-3.5 h-3.5" /> },
  MASTER: { label: 'Master Data', icon: <Database className="w-3.5 h-3.5" /> },
};

export default function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
  new Set(['OPERATION'])
);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const toggleSidebar = () => setCollapsed(!collapsed);
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) newExpanded.delete(category);
    else newExpanded.add(category);
    setExpandedCategories(newExpanded);
  };

  const isActivePath = (href: string) => {
    if (href === '/admin/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">

      {/* ============================================================
          SIDEBAR
      ============================================================ */}
      <aside
        className={`
          flex-shrink-0 h-full transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-64'}
          bg-[#0F1F35] text-white flex flex-col
        `}
      >
        {/* Logo */}
        <div className={`
          px-5 py-5 flex items-center 
          ${collapsed ? 'justify-center' : 'justify-between'}
          flex-shrink-0
        `}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden p-1.5">
                <img src="/favicon.ico" alt="Nusaena" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight">Nusaena</h1>
                <p className="text-[10px] text-slate-400 tracking-wide">v1.0 · WMS</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden p-1.5">
              <img src="/favicon.ico" alt="Nusaena" className="w-full h-full object-contain" />
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {Object.entries(categoryConfig).map(([category, config]) => {
            const items = groupedItems[category] || [];
            if (items.length === 0) return null;
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="space-y-1">
                {!collapsed ? (
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </div>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                    />
                  </button>
                ) : (
                  <div className="flex justify-center py-1">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <span className="text-slate-500">{config.icon}</span>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active = isActivePath(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.disabled ? '#' : item.href}
                          className={`
                            flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                            ${active
                              ? 'bg-white/10 text-white'
                              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                            }
                            ${item.disabled && 'opacity-40 cursor-not-allowed'}
                            ${collapsed && 'justify-center'}
                            group relative
                          `}
                          title={collapsed ? item.name : undefined}
                        >
                          {/* Active indicator */}
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-400 rounded-r-full"></span>
                          )}

                          <span className={active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}>
                            {item.icon}
                          </span>

                          {!collapsed && (
                            <span className="text-[13px] font-medium flex-1 truncate">
                              {item.name}
                            </span>
                          )}

                          {!collapsed && item.badge && (
                            <span className={`
                              text-[9px] font-bold px-1.5 py-0.5 rounded-md
                              ${item.badge === 'B2C'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                              }
                            `}>
                              {item.badge}
                            </span>
                          )}

                          {collapsed && item.badge && (
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="px-3 pb-4 pt-2 flex-shrink-0">
          <div className="border-t border-white/5 pt-3">
            {!collapsed ? (
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    AD
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">Administrator</p>
                    <p className="text-[10px] text-slate-500 truncate">Super Admin</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-500 hover:text-rose-400 flex-shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white text-xs font-bold">
                  AD
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-500 hover:text-rose-400"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ============================================================
          MAIN CONTENT
      ============================================================ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-800">Dashboard</h1>
              <p className="text-[11px] text-slate-400 font-medium">Nusaena v1.0 · Handover Management</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 relative">
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#0F1F35] flex items-center justify-center text-white text-[10px] font-bold">
                AD
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}