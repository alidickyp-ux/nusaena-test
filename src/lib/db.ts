// Koneksi ke Neon lewat driver serverless resmi mereka.
import { neon } from '@neondatabase/serverless';

// 🔥 Jangan throw error di build time
// Gunakan ternary untuk fallback
const connectionString = process.env.DATABASE_URL;

// 🔥 Export function yang akan di-resolve di runtime
export const sql = connectionString 
  ? neon(connectionString) 
  : (async () => {
      throw new Error('DATABASE_URL belum di-set');
    }) as any;

// 🔥 Tambahkan log untuk debug di Vercel
console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');