'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function OperatorShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const isSortingActive = pathname === '/sorting';
  const isHandoverActive = pathname === '/handover';

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-md mx-auto">
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

      <div
        className="h-1.5 w-full"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, #F59E0B 0px, #F59E0B 10px, #1C1917 10px, #1C1917 20px)',
        }}
      />

      <div className="flex-1 overflow-y-auto pb-24">{children}</div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-stone-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-50">
        <div className="flex justify-around p-2">
          <button onClick={() => router.push('/sorting')} className="flex flex-col items-center gap-1 py-1 px-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isSortingActive ? 'bg-orange-600 shadow-lg shadow-orange-600/30' : 'bg-stone-100'}`}>
              <svg className={`w-6 h-6 ${isSortingActive ? 'text-white' : 'text-stone-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className={`text-[11px] font-bold ${isSortingActive ? 'text-orange-700' : 'text-stone-400'}`}>Sorting</span>
          </button>

          <button onClick={() => router.push('/handover')} className="flex flex-col items-center gap-1 py-1 px-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isHandoverActive ? 'bg-orange-600 shadow-lg shadow-orange-600/30' : 'bg-stone-100'}`}>
              <svg className={`w-6 h-6 ${isHandoverActive ? 'text-white' : 'text-stone-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span className={`text-[11px] font-bold ${isHandoverActive ? 'text-orange-700' : 'text-stone-400'}`}>Handover</span>
          </button>
        </div>
      </div>
    </div>
  );
}
