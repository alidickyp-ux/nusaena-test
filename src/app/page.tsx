"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";

function redirectByRole(role: string, router: ReturnType<typeof useRouter>) {
  // Untuk ADMIN → dashboard admin
  if (role === "ADMIN") {
    router.replace("/admin/dashboard");
  } 
  // Untuk SECURITY → handover (mobile)
  else if (role === "SECURITY") {
    router.replace("/handover");
  } 
  // Untuk OPERATOR → menu (mobile)
  else if (role === "OPERATOR") {
    router.replace("/menu");
  } 
  // Default → menu
  else {
    router.replace("/menu");
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const { user } = await res.json();
          if (user) {
            showToast.success(`Selamat datang kembali, ${user.full_name || user.username}!`);
            redirectByRole(user.role, router);
          }
        }
      } catch {
        // belum login, biarkan di halaman login
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
        showToast.error(errorMessage);
        setLoading(false);
        return;
      }

      // Login sukses
      showToast.success(`Selamat datang, ${data.user?.full_name || username}!`, {
        description: "Anda berhasil masuk ke sistem",
      });
      
      redirectByRole(data.role, router);
    } catch (err) {
      const errorMessage = "Tidak bisa terhubung ke server. Periksa koneksi internet Anda.";
      setError(errorMessage);
      showToast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white text-2xl font-bold mb-4 shadow-lg shadow-indigo-200">
              C
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Nusaena v1</h1>
            <p className="text-sm text-slate-500 mt-1">Sorting &amp; Handover Management</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <input
                type="text"
                required
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Memproses..." : "Masuk ke Sistem"}
            </button>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400">&copy; 2026 . nusaena v1</p>
          </div>
        </div>
      </div>
    </div>
  );
}