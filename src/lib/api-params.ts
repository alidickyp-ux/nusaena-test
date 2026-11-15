/** Helper parsing query param untuk API route (aman dari NaN, nilai liar, dan wildcard LIKE). */

export function parsePagination(sp: URLSearchParams, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(sp.get("limit") || String(defaultLimit), 10) || defaultLimit)
  );
  return { page, limit, offset: (page - 1) * limit };
}

/** Terima hanya tanggal valid berformat YYYY-MM-DD, selain itu null. */
export function parseDateParam(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return value;
}

/** Terima hanya nilai yang ada di daftar `allowed`, selain itu null. */
export function parseEnumParam<T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** Ubah teks pencarian jadi pola ILIKE, dengan meng-escape % _ dan \ dari user. */
export function toLikePattern(search: string | null): string | null {
  const s = search?.trim();
  if (!s) return null;
  return `%${s.replace(/[\\%_]/g, "\\$&")}%`;
}