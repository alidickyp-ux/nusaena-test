# COOL System V3 — Sorting & Handover (Neon Edition)

## Perubahan besar dari versi sebelumnya
- **Database**: pindah dari Supabase ke **Neon** (Postgres murni)
- **Auth**: custom (JWT + bcrypt), bukan Supabase Auth lagi
- **Alur baru**: Handover bisa jalan **paralel** dengan Sorting — tidak perlu
  menunggu sesi ditutup manual. Sesi otomatis `CLOSED` begitu berita acara
  handover ditandatangani (lewat trigger database, bukan tombol manual).
- **Fokus rilis ini**: modul B2C (Sorting & Handover). B2B (Putaway & Loading)
  masih placeholder.

## Setup

### 1. Buat database di Neon
1. Daftar/login di https://neon.tech, buat project baru.
2. Salin **connection string** (yang versi *pooled connection*).

### 2. Jalankan skema
Buka SQL Editor di Neon Console (atau psql), jalankan berurutan:
```
db/schema.sql
db/seed_users.sql   -- opsional, untuk 3 akun percobaan
```

### 3. Environment variables
```bash
cp .env.example .env.local
```
Isi `.env.local`:
```
DATABASE_URL="<connection string dari Neon>"
JWT_SECRET="<string acak panjang, contoh: openssl rand -base64 32>"
```

### 4. Install & jalankan
```bash
npm install
npm run dev
```
Buka http://localhost:3000

### Akun percobaan (dari seed_users.sql)
| username | password    | role     |
|----------|-------------|----------|
| admin    | password123 | ADMIN    |
| hilmi    | password123 | OPERATOR |
| rian     | password123 | SECURITY |

**Ganti password ini sebelum dipakai sungguhan.**

## Struktur folder
```
cool-system-v3/
├── db/
│   ├── schema.sql          # tabel, index, function, trigger
│   └── seed_users.sql      # 3 akun contoh
├── src/
│   ├── middleware.ts       # auth guard + role-based redirect
│   ├── lib/
│   │   ├── db.ts           # koneksi Neon
│   │   ├── auth.ts         # sign/verify JWT
│   │   ├── sound.ts        # feedback suara scan (accepted/rejected)
│   │   └── utils.ts
│   ├── components/mobile/
│   │   ├── OperatorShell.tsx   # shell mobile: status bar, bottom nav, logout
│   │   └── SignaturePad.tsx    # canvas tanda tangan
│   └── app/
│       ├── page.tsx            # login (route: /)
│       ├── menu/page.tsx        # pilih B2C / B2B
│       ├── b2b/page.tsx         # placeholder
│       ├── sorting/page.tsx     # B2C — scan sorting
│       ├── handover/page.tsx    # B2C — scan handover + sign (paralel dgn sorting)
│       ├── admin/dashboard/page.tsx  # placeholder supervisi
│       └── api/
│           ├── auth/{login,logout,me}/route.ts
│           ├── sorting/scan/route.ts
│           └── handover/{sessions,detail,scan,finalize}/route.ts
```

## Alur data B2C
```
1. Operator scan resi di /sorting
   -> POST /api/sorting/scan -> function process_auto_sorting()
   -> auto-detect transporter dari prefix, auto-buat sesi RUNNING kalau belum ada
   -> insert ke sorting_details

2. (PARALEL, kapan saja selama sesi RUNNING)
   Operator/Security scan resi yang sama di /handover
   -> POST /api/handover/scan -> function process_handover_scan()
   -> tandai sorting_details.is_validated_handover = true

3. Operator klik "Selesaikan & Sign"
   -> kalau masih ada resi belum discan, wajib pilih alasan
      (Tidak Ditemukan / Cancel) per resi dulu
   -> isi nama kurir, nama security, KEDUA tanda tangan
   -> POST /api/handover/finalize -> function finalize_handover()
      - insert 1 baris ke handover_manifests (trigger otomatis set
        sorting_sessions.status = 'CLOSED')
      - insert history_logs untuk semua resi (arsip, status DONE/TIDAK
        DITEMUKAN/CANCEL)
```

## Yang belum dikerjakan (next steps)
- Dashboard admin (list sesi, manifest, export XLSX, print berita acara) —
  sudah pernah didesain untuk versi Supabase, tinggal diadaptasi ke Neon
  (ganti query `supabase.from()` jadi query `sql` biasa lewat API route).
- Modul B2B (Putaway & Loading).
- Halaman admin untuk kelola `users` dan `master_transporters` (sekarang
  harus insert manual lewat SQL).
