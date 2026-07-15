// Koneksi ke Neon lewat driver serverless resmi mereka.
import { neon } from '@neondatabase/serverless';

// 🔥 Jangan throw error di build time
// Gunakan lazy initialization
let sqlInstance: any = null;

function getSql() {
  if (!sqlInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('❌ DATABASE_URL is not set in environment variables');
      throw new Error('DATABASE_URL belum di-set di environment variables');
    }
    console.log('✅ DATABASE_URL is set, connecting to Neon...');
    sqlInstance = neon(connectionString);
  }
  return sqlInstance;
}

// 🔥 Export proxy yang akan initialize di runtime
export const sql = new Proxy({} as any, {
  get: (target, prop) => {
    const db = getSql();
    const value = db[prop];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  },
  apply: (target, thisArg, args) => {
    const db = getSql();
    return db(...args);
  },
});

// 🔥 Untuk template literal: sql`SELECT ...`
export default function sqlTemplate(strings: TemplateStringsArray, ...values: any[]) {
  const db = getSql();
  return db(strings, ...values);
}