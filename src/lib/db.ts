import { neon } from '@neondatabase/serverless';

// 🔥 Log untuk debug di Vercel
console.log('🔗 DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('🔗 NODE_ENV:', process.env.NODE_ENV);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in environment variables');
}

// 🔥 Jangan throw error di import, biarkan error di runtime
export const sql = connectionString 
  ? neon(connectionString) 
  : (async () => {
      throw new Error('DATABASE_URL is not configured');
    }) as any;