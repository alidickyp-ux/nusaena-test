"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildQuery, type QueryParams } from "@/lib/format";
import type { Pagination } from "@/components/admin/b2c/types";

/**
 * Halaman yang otomatis kembali ke 1 saat `key` (misalnya kombinasi filter) berubah,
 * tanpa useEffect tambahan sehingga tidak terjadi fetch ganda.
 */
export function useKeyedPage(key: string) {
  const [state, setState] = useState({ key, page: 1 });
  const page = state.key === key ? state.page : 1;
  const setPage = useCallback((p: number) => setState({ key, page: p }), [key]);
  return [page, setPage] as const;
}

interface Options {
  endpoint: string;
  filters: QueryParams;
  limit?: number;
  /** Interval auto-refresh dalam ms. 0 = mati. Hanya jalan saat tab browser terlihat. */
  pollMs?: number;
  /** false = endpoint tidak mendukung page/limit (data difilter di client). */
  paginated?: boolean;
}

interface ListResponse<T, S> {
  success?: boolean;
  message?: string;
  data?: T[];
  stats?: S | null;
  pagination?: Pagination | null;
}

export function useAdminList<T, S = unknown>({
  endpoint,
  filters,
  limit = 20,
  pollMs = 0,
  paginated = true,
}: Options) {
  const filtersKey = buildQuery(filters);
  const [page, setPage] = useKeyedPage(filtersKey);
  const query = paginated ? buildQuery({ ...filters, page, limit }) : filtersKey;

  const [data, setData] = useState<T[]>([]);
  const [stats, setStats] = useState<S | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true); // muat karena filter/halaman berubah
  const [refreshing, setRefreshing] = useState(false); // muat ulang di latar belakang
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (background: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (background) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await fetch(query ? `${endpoint}?${query}` : endpoint, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json: ListResponse<T, S> | null = await res.json().catch(() => null);

        if (!res.ok || !json || json.success === false) {
          throw new Error(json?.message || `Gagal memuat data (HTTP ${res.status})`);
        }

        setData(json.data ?? []);
        setStats(json.stats ?? null);
        setPagination(json.pagination ?? null);
        setError(null);
        setLastUpdated(new Date());
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Terjadi kesalahan saat memuat data");
      } finally {
        // Hanya request terbaru yang boleh mematikan indikator loading.
        if (abortRef.current === controller) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [endpoint, query]
  );

  // Muat saat filter / halaman berubah; batalkan request lama.
  useEffect(() => {
    load(false);
    return () => abortRef.current?.abort();
  }, [load]);

  // Auto-refresh, dilewati saat tab browser tidak terlihat.
  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  // Kalau halaman saat ini kosong (data menyusut), kembali ke halaman 1.
  useEffect(() => {
    if (paginated && !loading && !error && data.length === 0 && page > 1) setPage(1);
  }, [paginated, loading, error, data.length, page, setPage]);

  const refetch = useCallback(() => load(true), [load]);

  return {
    data,
    stats,
    pagination,
    loading,
    refreshing,
    error,
    lastUpdated,
    page,
    setPage,
    refetch,
  };
}