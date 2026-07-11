// Koneksi ke Neon lewat driver serverless resmi mereka.
// Bisa dipakai baik di Node runtime (API routes) maupun Edge runtime.
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum di-set di .env.local');
}

export const sql = neon(process.env.DATABASE_URL);
