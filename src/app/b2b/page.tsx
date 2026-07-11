"use client";

import { useRouter } from "next/navigation";
import OperatorShell from "@/components/mobile/OperatorShell";

export default function B2BPage() {
  const router = useRouter();

  return (
    <OperatorShell>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/menu")}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-stone-800">B2B Operations</h1>
        </div>
        
        <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-stone-300 text-center">
          <div className="text-4xl mb-4">🏗️</div>
          <h2 className="text-lg font-bold text-stone-700">Coming Soon</h2>
          <p className="text-sm text-stone-500 mt-2">
            B2B Putaway & Loading features are under development
          </p>
        </div>
      </div>
    </OperatorShell>
  );
}