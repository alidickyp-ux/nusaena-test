'use client';

import { useRouter } from 'next/navigation';

export default function OperatorShell({ 
  children 
}: { 
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex justify-between items-center border-b border-stone-200">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <span className="text-stone-700 text-xs font-bold uppercase tracking-wide">Online</span>
        </div>
        <span className="font-mono text-stone-500 text-xs font-semibold">
          {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
        </span>
        <button
          onClick={handleLogout}
          className="px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg active:scale-95 transition-transform"
        >
          Logout
        </button>
      </div>

      {/* Garis dekoratif */}
      <div
        className="h-1.5 w-full"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, #F59E0B 0px, #F59E0B 10px, #1C1917 10px, #1C1917 20px)',
        }}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        {children}
      </div>
    </div>
  );
}