"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  Building2,
  LogOut,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Handshake
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  category: 'B2C' | 'B2B' | 'ADMIN';
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, category: 'B2C' },
  { name: 'Handover Manifest', href: '/admin/manifest', icon: <Handshake className="w-4 h-4" />, category: 'B2C' },
  { name: 'B2B Management', href: '#', icon: <Building2 className="w-4 h-4" />, category: 'B2B' },
  { name: 'User Management', href: '/admin/users', icon: <Users className="w-4 h-4" />, category: 'ADMIN' },
];

const categoryLabels: Record<string, string> = {
  B2C: 'B2C Operations',
  B2B: 'B2B Enterprise',
  ADMIN: 'Administration',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const renderSection = (category: 'B2C' | 'B2B' | 'ADMIN') => {
    const items = navItems.filter((item) => item.category === category);
    if (items.length === 0) return null;

    return (
      <div key={category}>
        {sidebarOpen && (
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-semibold text-[#6f97b8] uppercase tracking-wider whitespace-nowrap">
              {categoryLabels[category]}
            </p>
            <div className="h-px flex-1 bg-[#1a3d5c]" />
          </div>
        )}
        <div className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href;
            const isDisabled = item.href === '#';

            if (isDisabled) {
              return (
                <div
                  key={item.name}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-lg
                    cursor-not-allowed opacity-40
                    ${!sidebarOpen && 'lg:justify-center'}
                  `}
                  title="Coming Soon"
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-md text-[#6f97b8]">
                    {item.icon}
                  </span>
                  {sidebarOpen && (
                    <span className="text-sm font-medium flex items-center gap-2 text-[#6f97b8]">
                      {item.name}
                      <span className="text-[8px] bg-[#1a3d5c] px-1.5 py-0.5 rounded uppercase tracking-wide">
                        Soon
                      </span>
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150
                  ${isActive ? 'bg-[#153350]' : 'hover:bg-[#122d49]'}
                  ${!sidebarOpen && 'lg:justify-center'}
                `}
                title={!sidebarOpen ? item.name : undefined}
              >
                <span
                  className={`
                    flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 shrink-0
                    ${isActive
                      ? 'bg-[#E87A2A] text-white shadow-sm shadow-[#E87A2A]/30'
                      : 'text-[#8ab4d6] group-hover:text-white'}
                  `}
                >
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <span
                    className={`text-sm transition-colors ${
                      isActive ? 'font-semibold text-white' : 'font-medium text-[#b0cfe0] group-hover:text-white'
                    }`}
                  >
                    {item.name}
                  </span>
                )}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-[#E87A2A]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:relative z-50 h-screen transition-all duration-300 shrink-0
          ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'}
          bg-[#0B2B4A] text-white flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ boxShadow: '4px 0 24px -8px rgba(11,43,74,0.35)' }}
      >
        {/* Edge collapse toggle (desktop only) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 rounded-full bg-[#0B2B4A] border border-[#1a3d5c] items-center justify-center text-[#8ab4d6] hover:text-white hover:bg-[#153350] transition-colors z-10"
        >
          {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Logo */}
        <div className={`p-4 border-b border-[#1a3d5c] flex items-center ${!sidebarOpen && 'lg:justify-center'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#E87A2A] rounded-md flex items-center justify-center font-bold text-sm shrink-0">
              C
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-none">COOL System</h1>
                <p className="text-[10px] text-[#8ab4d6] tracking-wider mt-1">V3 · WMS ERP</p>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {renderSection('B2C')}
          {renderSection('B2B')}
          {renderSection('ADMIN')}
        </nav>

        {/* Footer - status + version */}
        <div className="p-4 border-t border-[#1a3d5c]">
          {sidebarOpen ? (
            <div className="flex items-center justify-between text-[10px] text-[#6f97b8]">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                <span>System Operational</span>
              </div>
              <span>v3.0</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
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
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0B2B4A] to-[#1a3d5c] ring-2 ring-[#E87A2A]/20 flex items-center justify-center text-white text-xs font-bold">
                  AD
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-800">Administrator</p>
                  <p className="text-xs text-slate-500">Admin</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-800">Administrator</p>
                    <p className="text-xs text-slate-500">admin@coolsystem.com</p>
                  </div>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}