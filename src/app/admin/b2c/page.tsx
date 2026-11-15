"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, FileText, List, TrendingUp } from "lucide-react";
import SortingSessionTab from "@/components/admin/b2c/SortingSessionTab";
import ManifestTab from "@/components/admin/b2c/ManifestTab";
import HistoryTab from "@/components/admin/b2c/HistoryTab";
import { CARD } from "@/components/admin/b2c/shared";
import type { TabKey } from "@/components/admin/b2c/types";

const AUTO_REFRESH_MS = 30_000;

const TABS = [
  { key: "sorting", label: "Sorting Session", icon: Activity },
  { key: "manifest", label: "Handover Manifest", icon: List },
  { key: "history", label: "History Logs", icon: FileText },
] as const;

function isTabKey(value: string | null): value is TabKey {
  return TABS.some((t) => t.key === value);
}

function B2CAdminContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Tab aktif disimpan di URL (?tab=history) supaya refresh dan share link tetap di tab yang sama.
  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(tabParam) ? tabParam : "sorting";

  const changeTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const pollMs = autoRefresh ? AUTO_REFRESH_MS : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0B2B4A] to-[#1a3d5c] flex items-center justify-center shadow-lg shadow-[#0B2B4A]/20 flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-white" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Operasional B2C</h1>
            <p className="text-xs text-slate-500 font-medium">
              Monitoring sorting, handover & history paket retail
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span id="auto-refresh-label" className="text-xs font-bold text-slate-600">
            Auto-refresh
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={autoRefresh}
            aria-labelledby="auto-refresh-label"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              autoRefresh ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                autoRefresh ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Tab container */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="border-b border-slate-200 bg-slate-50/50">
          <div role="tablist" aria-label="Menu Operasional B2C" className="flex overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  id={`tab-${tab.key}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.key}`}
                  onClick={() => changeTab(tab.key)}
                  className={`relative px-5 py-3.5 text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                    isActive ? "text-[#0B2B4A]" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0B2B4A] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="p-5"
        >
          {activeTab === "sorting" && <SortingSessionTab pollMs={pollMs} />}
          {activeTab === "manifest" && <ManifestTab pollMs={pollMs} />}
          {activeTab === "history" && <HistoryTab pollMs={pollMs} />}
        </div>
      </div>
    </div>
  );
}

// useSearchParams di App Router perlu dibungkus Suspense agar build tidak error.
export default function B2CAdminPage() {
  return (
    <Suspense fallback={null}>
      <B2CAdminContent />
    </Suspense>
  );
}