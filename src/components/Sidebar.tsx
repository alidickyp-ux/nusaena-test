"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Package, 
  Handshake, 
  History,
  Users, 
  Building2,
  LogOut,
  User,
  ChevronDown,
  Menu,
  X,
  FileText,
  Box,
  Search,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Bell,
  HelpCircle,
  Shield,
  Truck,
  Warehouse,
  ClipboardList,
  Activity,
  BarChart3
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  category: 'B2C' | 'B2B' | 'ADMIN' | 'INSTANT';
  disabled?: boolean;
  badge?: string;
}

interface SidebarProps {
  children?: React.ReactNode;
}

const navItems: NavItem[] = [
  // B2C Menu
  { 
    name: 'Dashboard', 
    href: '/admin/dashboard', 
    icon: <LayoutDashboard className="w-4 h-4" />, 
    category: 'B2C' 
  },
  { 
    name: 'Sorting Sessions', 
    href: '/admin/sorting', 
    icon: <Package className="w-4 h-4" />, 
    category: 'B2C' 
  },
  { 
    name: 'Handover Manifest', 
    href: '/admin/manifest', 
    icon: <FileText className="w-4 h-4" />, 
    category: 'B2C' 
  },
  
  // INSTANT Menu
  { 
    name: 'Putaway', 
    href: '/putaway', 
    icon: <Box className="w-4 h-4" />, 
    category: 'INSTANT' 
  },
  { 
    name: 'Pickup', 
    href: '/pickup', 
    icon: <Search className="w-4 h-4" />, 
    category: 'INSTANT' 
  },
  
  // B2B Menu
  { 
    name: 'Manifest B2B', 
    href: '/admin/b2b/manifest', 
    icon: <Building2 className="w-4 h-4" />, 
    category: 'B2B'
  },
  
  // Admin Menu
  { 
    name: 'User Management', 
    href: '/admin/users', 
    icon: <Users className="w-4 h-4" />, 
    category: 'ADMIN' 
  },
  { 
    name: 'History Logs', 
    href: '/admin/history', 
    icon: <History className="w-4 h-4" />, 
    category: 'ADMIN' 
  },
];

const categoryLabels = {
  B2C: { label: 'B2C Operations', icon: <Truck className="w-3 h-3" /> },
  INSTANT: { label: 'Instant Operations', icon: <Activity className="w-3 h-3" /> },
  B2B: { label: 'B2B Enterprise', icon: <Warehouse className="w-3 h-3" /> },
  ADMIN: { label: 'Administration', icon: <Shield className="w-3 h-3" /> },
};

export default function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 h-screen transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-64'}
          bg-gradient-to-b from-[#0B2B4A] to-[#1a3d5c] text-white flex flex-col shadow-2xl
          ${collapsed ? 'lg:w-16' : 'lg:w-64'}
        `}
      >
        {/* Logo & Toggle */}
        <div className={`
          p-4 border-b border-[#1a3d5c] flex items-center 
          ${collapsed ? 'justify-center' : 'justify-between'}
        `}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#E87A2A] to-[#f59e0b] rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-orange-500/25">
                C
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Nusaena</h1>
                <p className="text-[10px] text-[#8ab4d6] tracking-wider">V1 - WMS</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-[#E87A2A] to-[#f59e0b] rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-orange-500/25">
              C
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`
              p-1 rounded-lg hover:bg-[#1a3d5c] transition-colors
              ${collapsed ? 'hidden lg:block' : 'block'}
            `}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-[#8ab4d6]" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-[#8ab4d6]" />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-[#1a3d5c] scrollbar-track-transparent">
          {Object.entries(categoryLabels).map(([category, { label, icon }]) => {
            const items = navItems.filter(item => item.category === category);
            if (items.length === 0) return null;

            return (
              <div key={category}>
                {!collapsed && (
                  <div className="flex items-center gap-2 px-2 mb-2">
                    <span className="text-[10px] font-semibold text-[#8ab4d6] uppercase tracking-wider">
                      {label}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  {items.map((item) => (
                    <Link
                      key={item.name}
                      href={item.disabled ? '#' : item.href}
                      onClick={(e) => {
                        if (item.disabled) {
                          e.preventDefault();
                        }
                      }}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                        ${pathname === item.href 
                          ? 'bg-white/10 text-white shadow-lg shadow-black/10 border-r-2 border-[#E87A2A]' 
                          : 'text-[#b0cfe0] hover:bg-white/5 hover:text-white'
                        }
                        ${item.disabled && 'opacity-40 cursor-not-allowed'}
                        ${collapsed && 'justify-center'}
                        group relative
                      `}
                      title={collapsed ? item.name : undefined}
                    >
                      <span className={`
                        ${pathname === item.href ? 'text-white' : 'text-[#b0cfe0] group-hover:text-white'}
                        transition-colors
                      `}>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="text-sm font-medium flex-1">{item.name}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="text-[8px] bg-[#E87A2A] px-1.5 py-0.5 rounded-full font-bold uppercase">
                          {item.badge}
                        </span>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute right-0 top-0 w-2 h-2 bg-[#E87A2A] rounded-full"></span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-[#1a3d5c] p-3">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E87A2A] to-[#f59e0b] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-orange-500/25">
                  AD
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Administrator</p>
                  <p className="text-[10px] text-[#8ab4d6]">Admin</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[#8ab4d6] hover:text-white"
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
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[#8ab4d6] hover:text-white"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0B2B4A] rounded-lg flex items-center justify-center text-white text-xs font-bold">
                ERP
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-slate-800">Dashboard</p>
                <p className="text-xs text-slate-500">Warehouse Management System</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Actions */}
            <div className="hidden md:flex items-center gap-2">
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700">
                <Bell className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0B2B4A] flex items-center justify-center text-white text-xs font-bold">
                  AD
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-800">Administrator</p>
                  <p className="text-xs text-slate-500">Admin</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 animate-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-800">Administrator</p>
                    <p className="text-xs text-slate-500">admin@coolsystem.com</p>
                  </div>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <div className="border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}