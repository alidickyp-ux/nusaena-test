-- Contoh user untuk testing awal. Password ketiganya: "password123"
-- WAJIB ganti password ini setelah testing selesai.
-- Untuk generate hash baru: node -e "console.log(require('bcryptjs').hashSync('passwordbaru', 10))"

INSERT INTO public.users (username, password_hash, full_name, role) VALUES
  ('admin', '$2b$10$q/cz6IV2foVKwGgS9z64aOIhr8oGBcEYCtis1Zo6qeGyNBv5sxtnG', 'Admin Utama',    'ADMIN'),
  ('hilmi', '$2b$10$q/cz6IV2foVKwGgS9z64aOIhr8oGBcEYCtis1Zo6qeGyNBv5sxtnG', 'Hilmi Operator', 'OPERATOR'),
  ('rian',  '$2b$10$q/cz6IV2foVKwGgS9z64aOIhr8oGBcEYCtis1Zo6qeGyNBv5sxtnG', 'Rian Security',  'SECURITY')
ON CONFLICT (username) DO NOTHING;
