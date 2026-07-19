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
  ChevronLeft,
  ChevronRight,
  Settings,
  Bell,
  HelpCircle,
  Shield,
  Truck,
  Warehouse,
  ClipboardList,
  Activity,
  BarChart3,
  Store,
  Zap,
  Box,
  Search,
  FileText,
  Eye,
  Monitor,
  Layers,
  Cog,
  Database,
  MapPin,
  HardDrive,
  Globe,
  Network,
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
  isSubItem?: boolean;
}

interface SidebarProps {
  children?: React.ReactNode;
}

const navItems: NavItem[] = [
  // ============ OPERATION MONITORING ============
  { 
    name: 'Dashboard', 
    href: '/admin/dashboard', 
    icon: <LayoutDashboard className="w-4 h-4" />, 
    category: 'OPERATION' 
  },
  { 
    name: 'Online Operation', 
    href: '/admin/b2c', 
    icon: <Monitor className="w-4 h-4" />, 
    category: 'OPERATION',
    badge: 'B2C'
  },
  { 
    name: 'Offline Operation', 
    href: '/admin/b2b/manifest', 
    icon: <HardDrive className="w-4 h-4" />, 
    category: 'OPERATION',
    badge: 'B2B'
  },

  // ============ TOOLS OPERATION ============
  { 
    name: 'Putaway', 
    href: '/putaway', 
    icon: <Box className="w-4 h-4" />, 
    category: 'TOOLS' 
  },
  { 
    name: 'Pickup', 
    href: '/pickup', 
    icon: <Search className="w-4 h-4" />, 
    category: 'TOOLS' 
  },
  { 
    name: 'Sorting', 
    href: '/admin/sorting', 
    icon: <Package className="w-4 h-4" />, 
    category: 'TOOLS' 
  },
  { 
    name: 'Handover', 
    href: '/admin/manifest', 
    icon: <FileText className="w-4 h-4" />, 
    category: 'TOOLS' 
  },

  // ============ ADMINISTRATION ============
  { 
    name: 'User Management', 
    href: '/admin/users', 
    icon: <Users className="w-4 h-4" />, 
    category: 'ADMIN' 
  },

  // ============ MASTER ============
  { 
    name: 'Master Ekspedisi', 
    href: '/admin/master/transporter', 
    icon: <Truck className="w-4 h-4" />, 
    category: 'MASTER' 
  },
  { 
    name: 'Master Store', 
    href: '/admin/master/store', 
    icon: <Store className="w-4 h-4" />, 
    category: 'MASTER' 
  },
];

const categoryConfig = {
  OPERATION: { 
    label: 'Operation Monitoring', 
    icon: <Activity className="w-3 h-3" />,
    bgColor: 'from-blue-900/20 to-blue-800/10',
    borderColor: 'border-blue-400/30',
    textColor: 'text-blue-300'
  },
  TOOLS: { 
    label: 'Tools Operation', 
    icon: <Layers className="w-3 h-3" />,
    bgColor: 'from-emerald-900/20 to-emerald-800/10',
    borderColor: 'border-emerald-400/30',
    textColor: 'text-emerald-300'
  },
  ADMIN: { 
    label: 'Administration', 
    icon: <Shield className="w-3 h-3" />,
    bgColor: 'from-purple-900/20 to-purple-800/10',
    borderColor: 'border-purple-400/30',
    textColor: 'text-purple-300'
  },
  MASTER: { 
    label: 'Master Data', 
    icon: <Database className="w-3 h-3" />,
    bgColor: 'from-amber-900/20 to-amber-800/10',
    borderColor: 'border-amber-400/30',
    textColor: 'text-amber-300'
  },
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

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const isActivePath = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Group items by category
  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 h-screen transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-64'}
          bg-gradient-to-b from-[#0B1A2E] via-[#0B2B4A] to-[#0D3B5C] text-white flex flex-col shadow-2xl
          ${collapsed ? 'lg:w-16' : 'lg:w-64'}
        `}
      >
        {/* Logo & Toggle */}
        <div className={`
          px-4 py-4 border-b border-white/10 flex items-center 
          ${collapsed ? 'justify-center' : 'justify-between'}
        `}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#E87A2A] to-[#f59e0b] rounded-xl flex items-center justify-center font-bold text-base shadow-lg shadow-orange-500/30">
                C
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">Nusaena</h1>
                <p className="text-[10px] text-blue-300/70 tracking-wider">Warehouse Management</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-[#E87A2A] to-[#f59e0b] rounded-xl flex items-center justify-center font-bold text-base shadow-lg shadow-orange-500/30">
              C
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`
              p-1.5 rounded-lg hover:bg-white/10 transition-colors
              ${collapsed ? 'hidden lg:block' : 'block'}
            `}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-blue-300/70" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-blue-300/70" />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {Object.entries(categoryConfig).map(([category, config]) => {
            const items = groupedItems[category] || [];
            if (items.length === 0) return null;
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="space-y-1">
                {/* Category Header */}
                {!collapsed ? (
                  <button
                    onClick={() => toggleCategory(category)}
                    className={`
                      w-full flex items-center justify-between px-3 py-1.5 rounded-lg
                      text-[10px] font-semibold uppercase tracking-wider
                      ${config.textColor} hover:bg-white/5 transition-colors
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="opacity-70">{config.icon}</span>
                      <span>{config.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDownIcon className="w-3 h-3 opacity-50" />
                    ) : (
                      <ChevronRightIcon className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                ) : (
                  <div className="flex justify-center py-1">
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                      <span className="text-blue-300/50 text-xs">{config.icon}</span>
                    </div>
                  </div>
                )}

                {/* Category Items */}
                {isExpanded && (
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <Link
                        key={item.name}
                        href={item.disabled ? '#' : item.href}
                        onClick={(e) => {
                          if (item.disabled) e.preventDefault();
                        }}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                          ${isActivePath(item.href) 
                            ? 'bg-white/10 text-white shadow-lg shadow-black/10 border-r-2 border-[#E87A2A]' 
                            : 'text-blue-200/70 hover:bg-white/5 hover:text-white'
                          }
                          ${item.disabled && 'opacity-40 cursor-not-allowed'}
                          ${collapsed && 'justify-center'}
                          ${item.isSubItem && 'pl-7'}
                          group relative
                        `}
                        title={collapsed ? item.name : undefined}
                      >
                        <span className={`
                          ${isActivePath(item.href) ? 'text-white' : 'text-blue-300/70 group-hover:text-white'}
                          transition-colors
                        `}>
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <span className="text-sm font-medium flex-1">{item.name}</span>
                        )}
                        {!collapsed && item.badge && (
                          <span className={`
                            text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase
                            ${item.badge === 'B2C' ? 'bg-blue-500/30 text-blue-300' : ''}
                            ${item.badge === 'B2B' ? 'bg-emerald-500/30 text-emerald-300' : ''}
                            ${item.badge === 'NEW' ? 'bg-orange-500/30 text-orange-300 animate-pulse' : ''}
                          `}>
                            {item.badge}
                          </span>
                        )}
                        {collapsed && item.badge && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse"></span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-white/10 p-3 mt-auto">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E87A2A] to-[#f59e0b] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-orange-500/25">
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
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E87A2A] to-[#f59e0b] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-orange-500/25">
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
                WMS
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
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700 relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700">
                <HelpCircle className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700">
                <Settings className="w-4 h-4" />
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
                  <p className="text-xs text-slate-500">Super Admin</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 animate-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-800">Administrator</p>
                    <p className="text-xs text-slate-500">admin@nusaena.com</p>
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