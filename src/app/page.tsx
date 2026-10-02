"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Package,
} from "lucide-react";
import { toast } from '@/lib/toast';

function redirectByRole(role: string, router: ReturnType<typeof useRouter>) {
  if (role === "ADMIN") {
    router.replace("/admin/dashboard");
  } else if (role === "SECURITY") {
    router.replace("/handover");
  } else if (role === "OPERATOR") {
    router.replace("/menu");
  } else {
    router.replace("/menu");
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const { user } = await res.json();
          if (user) {
            toast.success(`Selamat datang kembali, ${user.full_name || user.username}!`);
            redirectByRole(user.role, router);
          }
        }
      } catch {
        // belum login
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.error || "Login gagal. Periksa username dan password Anda.";
        setError(errorMessage);
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      toast.success(`Selamat datang, ${data.user?.full_name || username}!`, {
        description: "Anda berhasil masuk ke sistem",
      });

      redirectByRole(data.role, router);
    } catch (err) {
      const errorMessage = "Tidak bisa terhubung ke server. Periksa koneksi internet Anda.";
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B2B4A] via-[#0f3357] to-[#1a3d5c] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-4 shadow-2xl overflow-hidden p-3">
              <img
                src="/favicon.ico"
                alt="Nusaena Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Nusaena
            </h1>
            <p className="text-sm text-white/60 mt-1 font-medium">
              Handover Management System
            </p>
          </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-7">
          
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-extrabold text-slate-900">
              Selamat Datang
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Masuk untuk melanjutkan
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl flex items-start gap-2">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:border-[#0B2B4A] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#0B2B4A] hover:bg-[#1a3d5c] text-white font-extrabold rounded-xl transition-all shadow-lg shadow-[#0B2B4A]/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Masuk ke Sistem
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sistem aman · Terenkripsi</span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-[11px] text-white/40 mt-6 font-mono">
          © 2026 · nusaena v1
        </p>
      </div>
    </div>
  );
}