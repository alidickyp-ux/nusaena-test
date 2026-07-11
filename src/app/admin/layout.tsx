"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  History, 
  Users, 
  Building2,
  LogOut,
  User,
  ChevronDown,
  Menu,
  X,
  Scan,
  Handshake
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  category: 'B2C' | 'B2B' | 'ADMIN';
}

const navItems: NavItem[] = [
  // B2C Menu
  { name: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, category: 'B2C' },
  { name: 'Handover Manifest', href: '/admin/manifest', icon: <Handshake className="w-4 h-4" />, category: 'B2C' },
  
  
  // B2B Menu (Coming Soon)
  { name: 'B2B Management', href: '#', icon: <Building2 className="w-4 h-4" />, category: 'B2B' },
  
  // Admin Menu
  { name: 'User Management', href: '/admin/users', icon: <Users className="w-4 h-4" />, category: 'ADMIN' },
];

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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:relative z-50 h-screen transition-all duration-300
          ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'}
          bg-[#0B2B4A] text-white flex flex-col shadow-2xl
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className={`p-4 border-b border-[#1a3d5c] flex items-center ${!sidebarOpen && 'lg:justify-center'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#E87A2A] rounded flex items-center justify-center font-bold text-sm">
              C
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-lg font-bold tracking-tight">COOL System</h1>
                <p className="text-[10px] text-[#8ab4d6] tracking-wider">V3 - WMS ERP</p>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* B2C Section */}
          <div>
            {sidebarOpen && (
              <p className="text-[10px] font-semibold text-[#8ab4d6] uppercase tracking-wider mb-3">
                B2C Operations
              </p>
            )}
            <div className="space-y-1">
              {navItems.filter(item => item.category === 'B2C').map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded transition-all
                    ${pathname === item.href 
                      ? 'bg-[#1a3d5c] text-white border-r-4 border-[#E87A2A]' 
                      : 'hover:bg-[#1a3d5c] text-[#b0cfe0] hover:text-white'
                    }
                    ${!sidebarOpen && 'lg:justify-center'}
                  `}
                  title={!sidebarOpen ? item.name : undefined}
                >
                  {item.icon}
                  {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
                </Link>
              ))}
            </div>
          </div>

          {/* B2B Section */}
          <div>
            {sidebarOpen && (
              <p className="text-[10px] font-semibold text-[#8ab4d6] uppercase tracking-wider mb-3">
                B2B Enterprise
              </p>
            )}
            <div className="space-y-1">
              {navItems.filter(item => item.category === 'B2B').map((item) => (
                <div
                  key={item.name}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded
                    text-[#5a8aaa] cursor-not-allowed opacity-50
                    ${!sidebarOpen && 'lg:justify-center'}
                  `}
                  title="Coming Soon"
                >
                  {item.icon}
                  {sidebarOpen && (
                    <span className="text-sm font-medium flex items-center gap-2">
                      {item.name}
                      <span className="text-[8px] bg-[#1a3d5c] px-1.5 py-0.5 rounded uppercase">
                        Soon
                      </span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Admin Section */}
          <div>
            {sidebarOpen && (
              <p className="text-[10px] font-semibold text-[#8ab4d6] uppercase tracking-wider mb-3">
                Administration
              </p>
            )}
            <div className="space-y-1">
              {navItems.filter(item => item.category === 'ADMIN').map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded transition-all
                    ${pathname === item.href 
                      ? 'bg-[#1a3d5c] text-white border-r-4 border-[#E87A2A]' 
                      : 'hover:bg-[#1a3d5c] text-[#b0cfe0] hover:text-white'
                    }
                    ${!sidebarOpen && 'lg:justify-center'}
                  `}
                  title={!sidebarOpen ? item.name : undefined}
                >
                  {item.icon}
                  {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#1a3d5c]">
          {sidebarOpen ? (
            <div className="text-[10px] text-[#5a8aaa] text-center">
              © 2026 COOL System v3
            </div>
          ) : (
            <div className="text-center text-[#5a8aaa] text-[10px]">v3</div>
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
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
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
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0B2B4A] flex items-center justify-center text-white text-xs font-bold">
                  AD
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-800">Administrator</p>
                  <p className="text-xs text-slate-500">Admin</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
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