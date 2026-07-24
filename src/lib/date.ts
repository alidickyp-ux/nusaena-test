// src/lib/date.ts
export function formatWIB(dateStr: string): string {
  // Parse string dengan format "YYYY-MM-DD HH:mm:ss"
  const parts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!parts) return dateStr; // fallback

  const year = parseInt(parts[1]);
  const month = parseInt(parts[2]) - 1;
  const day = parseInt(parts[3]);
  const hour = parseInt(parts[4]);
  const minute = parseInt(parts[5]);
  const second = parseInt(parts[6]);

  // Buat Date sebagai UTC
  const utcDate = new Date(Date.UTC(year, month, day, hour, minute, second));

  // Tambahkan 7 jam (WIB = UTC+7)
  utcDate.setUTCHours(utcDate.getUTCHours() + 7);

  // Format manual agar konsisten
  const pad = (n: number) => String(n).padStart(2, '0');
  const dayStr = pad(utcDate.getUTCDate());
  const monthStr = pad(utcDate.getUTCMonth() + 1);
  const yearStr = utcDate.getUTCFullYear();
  const hourStr = pad(utcDate.getUTCHours());
  const minuteStr = pad(utcDate.getUTCMinutes());
  const secondStr = pad(utcDate.getUTCSeconds());

  return `${dayStr}/${monthStr}/${yearStr}, ${hourStr}.${minuteStr}.${secondStr}`;
}