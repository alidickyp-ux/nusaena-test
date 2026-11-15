/**
 * Unduh file dari endpoint API.
 * Melempar Error (dengan pesan dari server jika ada) kalau gagal,
 * jadi pemanggil cukup try/catch lalu tampilkan toast.
 */
export async function downloadFromApi(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || `Gagal mengunduh file (HTTP ${res.status})`);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}