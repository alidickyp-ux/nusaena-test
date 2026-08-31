'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SoListItem {
  id: string;
  soNumber: string;
  customer: string | null;
  status: string;
  totalQtySo: number;
  totalQtyPicked: number;
}

export default function PickingIndexPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SoListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/b2b/picking')
      .then((res) => res.json())
      .then((data) => setOrders(data.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4 text-sm text-stone-400">Loading...</div>;
  }

  return (
    <div className="max-w-sm mx-auto p-4 space-y-3">
      <h1 className="text-base font-medium">Pilih sales order</h1>

      {orders.length === 0 && (
        <p className="text-sm text-stone-400">Tidak ada SO yang siap dipick.</p>
      )}

      {orders.map((so) => (
        <button
          key={so.id}
          onClick={() => router.push(`/b2b/picking/${so.id}`)}
          className="w-full text-left border rounded-xl p-4 hover:bg-stone-50 active:scale-[0.98] transition-all"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-sm">{so.soNumber}</p>
              <p className="text-xs text-stone-500">{so.customer ?? '-'}</p>
            </div>
            <p className="text-xs text-stone-500">
              {so.totalQtyPicked} / {so.totalQtySo} pcs
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}