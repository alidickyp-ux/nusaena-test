"use client";

import { useEffect } from "react";

// Definisikan tipe OrientationLockType yang hilang
type OrientationLockType = 
  | 'any'
  | 'natural'
  | 'landscape'
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape-primary'
  | 'landscape-secondary';

// 🔥 Lapisan kedua selain `orientation: 'portrait'` di manifest.ts.
// Manifest cuma jadi hint saat pertama kali render standalone mode —
// di sebagian build Chrome (termasuk yang dipreload di rugged device
// seperti Zebra), hint ini kadang tidak konsisten dihormati terus,
// terutama setelah device benar-benar diputar fisik. Screen Orientation
// API di sini aktif memaksa lock, dan re-lock lagi tiap ada perubahan
// orientasi supaya nggak "kelupaan".
export function OrientationLock() {
  useEffect(() => {
    // Cek apakah screen.orientation tersedia (client-side)
    if (typeof window === 'undefined' || !('orientation' in screen)) {
      return;
    }

    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: OrientationLockType) => Promise<void>;
    };

    const lockPortrait = () => {
      orientation?.lock?.("portrait" as OrientationLockType).catch(() => {
        // Gagal lock itu wajar kalau browser belum di mode
        // standalone/fullscreen (mis. dibuka di tab browser biasa).
      });
    };

    lockPortrait();
    orientation?.addEventListener?.("change", lockPortrait);
    return () => orientation?.removeEventListener?.("change", lockPortrait);
  }, []);

  return null;
}