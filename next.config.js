/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/_offline',
  },
  runtimeCaching: [
    // 🔥 WAJIB PALING ATAS: semua request ke /api/* JANGAN pernah di-cache.
    // Data session/status harus selalu fresh dari server, bukan dari
    // Service Worker cache — kalau tidak, sesi yang sudah CLOSED/di-handover
    // bisa tetap muncul basi walau sudah hard refresh.
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly',
    },
    // Asset gambar/icon — aman di-cache lama untuk offline
    {
      urlPattern: /^https?.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 hari
        },
      },
    },
    // JS/CSS build assets — StaleWhileRevalidate: cepat tampil, tetap update di background
    {
      urlPattern: /^https?.*\.(?:js|css)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
      },
    },
    // Sisanya (halaman/navigasi) — NetworkFirst dengan timeout,
    // supaya kalau network mati baru fallback ke cache, bukan langsung diam-diam pakai cache.
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  experimental: {
    serverActions: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = withPWA(nextConfig);