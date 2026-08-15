"use client";

/**
 * 🔥 Overlay peringatan "putar ke portrait" — fallback terakhir.
 *
 * Ini murni pakai CSS media query `orientation: landscape`, jadi tetap
 * berfungsi walaupun:
 * - screen.orientation.lock() gagal/tidak didukung
 * - manifest orientation diabaikan oleh WebView
 * - device (Zebra dkk) override rotasi lewat layer MX/EMM sendiri
 *
 * Cara pakai: taruh komponen ini sekali di root layout atau di OperatorShell,
 * di luar/di atas children lain.
 */
export default function LandscapeGuard() {
  return (
    <div
      className="landscape-guard"
      style={{
        display: "none",
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0B2B4A",
        color: "white",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
      <p style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
        Putar Perangkat ke Portrait
      </p>
      <p style={{ fontSize: 13, opacity: 0.8, maxWidth: 280 }}>
        Aplikasi ini hanya didukung dalam mode portrait. Silakan putar
        perangkat kembali ke posisi tegak.
      </p>

      <style jsx>{`
        /* 🔥 max-width penting: tanpa ini, overlay juga muncul di monitor
           desktop karena desktop hampir selalu "landscape" (lebar > tinggi).
           768px dipilih sebagai batas kasar handphone/handheld vs tablet/desktop —
           sesuaikan kalau device target kamu (mis. Zebra TC2x) punya lebar
           layar berbeda. */
        @media (orientation: landscape) and (max-width: 768px) {
          .landscape-guard {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}