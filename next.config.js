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
    // 🔥 FIX UTAMA PWA CACHE: Menggunakan regex yang mencakup root URL internal server Anda
    {
      urlPattern: /\/api\/.*$/,
      handler: 'NetworkOnly', // Mutlak tembak ke server, dilarang simpan/baca cache HP
      options: {
        backgroundSync: {
          name: 'api-sync',
          options: {
            maxRetentionTime: 24 * 60,
          },
        },
      },
    },
    // Asset gambar/icon — aman di-cache lama untuk offline
    {
      urlPattern: /^https?.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    // JS/CSS build assets
    {
      urlPattern: /^https?.*\.(?:js|css)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
      },
    },
    // Sisanya — NetworkFirst
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
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL || '',
  },
};

module.exports = withPWA(nextConfig);