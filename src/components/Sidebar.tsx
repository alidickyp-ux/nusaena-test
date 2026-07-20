"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Package, 
  LogOut,
  User,
  Users,
  ChevronDown,
  Menu,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bell,
  HelpCircle,
  Shield,
  Truck,
  Store,
  Box,
  Search,
  FileText,
  Monitor,
  Layers,
  Database,
  HardDrive,
  Activity,
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
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
  { name: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, category: 'OPERATION' },
  { name: 'Online Operation', href: '/admin/b2c', icon: <Monitor className="w-4 h-4" />, category: 'OPERATION', badge: 'B2C' },
  { name: 'Offline Operation', href: '/admin/b2b/manifest', icon: <HardDrive className="w-4 h-4" />, category: 'OPERATION', badge: 'B2B' },
  { name: 'Putaway', href: '/putaway', icon: <Box className="w-4 h-4" />, category: 'TOOLS' },
  { name: 'Pickup', href: '/pickup', icon: <Search className="w-4 h-4" />, category: 'TOOLS' },
  { name: 'Sorting', href: '/sorting', icon: <Package className="w-4 h-4" />, category: 'TOOLS' },
  { name: 'Handover', href: '/handover', icon: <FileText className="w-4 h-4" />, category: 'TOOLS' },
  { name: 'User Management', href: '/admin/users', icon: <Users className="w-4 h-4" />, category: 'ADMIN' },
  { name: 'Master Ekspedisi', href: '/admin/master/transporter', icon: <Truck className="w-4 h-4" />, category: 'MASTER' },
  { name: 'Master Store', href: '/admin/master/store', icon: <Store className="w-4 h-4" />, category: 'MASTER' },
];

const categoryConfig = {
  OPERATION: { label: 'Monitoring', icon: <Activity className="w-3 h-3" /> },
  TOOLS: { label: 'Tools', icon: <Layers className="w-3 h-3" /> },
  ADMIN: { label: 'Administration', icon: <Shield className="w-3 h-3" /> },
  MASTER: { label: 'Master Data', icon: <Database className="w-3 h-3" /> },
};

export default function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['OPERATION', 'TOOLS', 'ADMIN', 'MASTER']));

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
    // 🔥 Gunakan flex dengan height: 100vh dan overflow hidden
    <div className="h-screen flex overflow-hidden bg-slate-50">
      
      {/* ============================================================
          SIDEBAR - FULL HEIGHT dengan background biru
      ============================================================ */}
      <aside
        className={`
          flex-shrink-0 h-full transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-64'}
          bg-gradient-to-b from-[#0B2B4A] to-[#1a4a6e] text-white flex flex-col
          shadow-xl
        `}
      >
        {/* Logo */}
        <div className={`
          px-4 py-4 border-b border-white/10 flex items-center 
          ${collapsed ? 'justify-center' : 'justify-between'}
          flex-shrink-0
        `}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#E87A2A] to-[#f59e0b] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-500/25">
                W
              </div>
              <div>
                <h1 className="text-base font-bold text-white">WMS</h1>
                <p className="text-[9px] text-blue-300/70 tracking-wider">Warehouse System</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-[#E87A2A] to-[#f59e0b] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-500/25">
              W
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`p-1 rounded-lg hover:bg-white/10 transition-colors text-blue-300/70 hover:text-white ${collapsed ? 'hidden lg:block' : 'block'}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Menu Items - Scrollable */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {Object.entries(categoryConfig).map(([category, config]) => {
            const items = groupedItems[category] || [];
            if (items.length === 0) return null;
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="space-y-1">
                {!collapsed ? (
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-blue-300/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="opacity-70">{config.icon}</span>
                      <span>{config.label}</span>
                    </div>
                    {isExpanded ? <ChevronDownIcon className="w-3 h-3 opacity-50" /> : <ChevronRightIcon className="w-3 h-3 opacity-50" />}
                  </button>
                ) : (
                  <div className="flex justify-center py-1">
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                      <span className="text-blue-300/50 text-xs">{config.icon}</span>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <Link
                        key={item.name}
                        href={item.disabled ? '#' : item.href}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                          ${isActivePath(item.href) 
                            ? 'bg-white/10 text-white shadow-lg shadow-black/10 border-r-2 border-[#E87A2A]' 
                            : 'text-blue-200/70 hover:bg-white/5 hover:text-white'
                          }
                          ${item.disabled && 'opacity-40 cursor-not-allowed'}
                          ${collapsed && 'justify-center'}
                          group relative
                        `}
                        title={collapsed ? item.name : undefined}
                      >
                        <span className={isActivePath(item.href) ? 'text-white' : 'text-blue-300/70 group-hover:text-white'}>
                          {item.icon}
                        </span>
                        {!collapsed && <span className="text-sm flex-1">{item.name}</span>}
                        {!collapsed && item.badge && (
                          <span className={`text-[6px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            item.badge === 'B2C' ? 'bg-blue-500/30 text-blue-300' : 'bg-emerald-500/30 text-emerald-300'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                        {collapsed && item.badge && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile - Fixed di bottom */}
        <div className="border-t border-white/10 p-3 flex-shrink-0">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E87A2A] to-[#f59e0b] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-orange-500/25">
                  AD
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Administrator</p>
                  <p className="text-[10px] text-blue-300/70">Super Admin</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-blue-300/70 hover:text-white"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E87A2A] to-[#f59e0b] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-orange-500/25">
                AD
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-blue-300/70 hover:text-white"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ============================================================
          MAIN CONTENT - Flex 1 dan overflow auto
      ============================================================ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-slate-800">Dashboard</h1>
              <p className="text-xs text-slate-400">Warehouse Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#0B2B4A] flex items-center justify-center text-white text-[10px] font-bold">
                AD
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}