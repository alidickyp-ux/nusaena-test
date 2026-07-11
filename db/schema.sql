-- =====================================================================
-- COOL SYSTEM V3 — SCHEMA NEON (POSTGRES)
-- B2C: Sorting & Handover (paralel)
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- untuk gen_random_uuid()

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'OPERATOR', 'SECURITY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------
-- USERS (auth custom, bukan Supabase auth.users lagi)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username varchar(50) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name varchar(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'OPERATOR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------------
-- MASTER TRANSPORTERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.master_transporters (
  id serial NOT NULL,
  transporter_name varchar(100) NOT NULL,
  tracking_prefix text, -- pisahkan dengan koma kalau lebih dari satu prefix
  tracking_length_min integer,
  tracking_length_max integer,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT master_transporters_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------------
-- SORTING SESSIONS
-- Lifecycle sekarang cuma 2 status:
--   RUNNING -> sorting & handover boleh jalan paralel
--   CLOSED  -> HANYA bisa dicapai lewat trigger setelah handover_manifests terisi (wajib sign)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sorting_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_code varchar(50) NOT NULL UNIQUE,
  transporter_id integer NOT NULL,
  operator_id uuid NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'RUNNING', -- RUNNING | CLOSED
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz NULL,
  CONSTRAINT sorting_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT fk_sorting_operator FOREIGN KEY (operator_id) REFERENCES public.users(id),
  CONSTRAINT fk_sorting_transporter FOREIGN KEY (transporter_id) REFERENCES public.master_transporters(id),
  CONSTRAINT chk_session_status CHECK (status IN ('RUNNING', 'CLOSED'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sorting_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_operator ON public.sorting_sessions(operator_id);

-- ---------------------------------------------------------------------
-- SORTING DETAILS (1 baris = 1 resi)
-- is_validated_handover bisa jadi TRUE kapan saja selagi session RUNNING —
-- inilah yang bikin handover "paralel", tidak menunggu sesi ditutup.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sorting_details (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  barcode_resi varchar(100) NOT NULL,
  sorting_by uuid NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  is_validated_handover boolean NOT NULL DEFAULT false,
  validated_by uuid NULL,
  validated_at timestamptz NULL,
  discrepancy_reason varchar(20) NULL, -- NOT_FOUND | CANCELLED, NULL = normal/matched
  CONSTRAINT sorting_details_pkey PRIMARY KEY (id),
  CONSTRAINT sorting_details_resi_unique UNIQUE (session_id, barcode_resi),
  CONSTRAINT uq_sorting_details_barcode UNIQUE (barcode_resi),
  CONSTRAINT fk_details_session FOREIGN KEY (session_id) REFERENCES public.sorting_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_details_sorting_by FOREIGN KEY (sorting_by) REFERENCES public.users(id),
  CONSTRAINT fk_details_validated_by FOREIGN KEY (validated_by) REFERENCES public.users(id),
  CONSTRAINT chk_discrepancy_reason CHECK (discrepancy_reason IN ('NOT_FOUND', 'CANCELLED') OR discrepancy_reason IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_details_session ON public.sorting_details(session_id);
CREATE INDEX IF NOT EXISTS idx_details_validated ON public.sorting_details(session_id, is_validated_handover);

-- ---------------------------------------------------------------------
-- HANDOVER MANIFESTS (1 baris = 1 sesi, WAJIB unik per sesi)
-- Insert ke tabel ini = "tanda tangan sudah dilakukan" = trigger nutup sesi.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.handover_manifests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  courier_name varchar(100) NOT NULL,
  security_name varchar(100) NOT NULL,
  courier_signature text NOT NULL,
  security_signature text NOT NULL,
  total_packages_handed integer NOT NULL DEFAULT 0,
  total_discrepancy integer NOT NULL DEFAULT 0,
  handover_by uuid NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT handover_manifests_pkey PRIMARY KEY (id),
  CONSTRAINT fk_manifest_session FOREIGN KEY (session_id) REFERENCES public.sorting_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_manifest_handover_by FOREIGN KEY (handover_by) REFERENCES public.users(id),
  CONSTRAINT uq_manifest_session UNIQUE (session_id)
);

-- ---------------------------------------------------------------------
-- HISTORY LOGS (arsip per-resi, dibuat otomatis lewat function finalize_handover)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.history_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  session_code varchar(50) NOT NULL,
  transporter_name varchar(100) NOT NULL,
  resi_number varchar(100) NOT NULL,
  sorting_at timestamptz NULL,
  sorting_by varchar(100) NULL,
  handover_at timestamptz NOT NULL DEFAULT now(),
  handover_by varchar(100) NULL,
  status varchar(20) NOT NULL DEFAULT 'DONE', -- DONE | TIDAK DITEMUKAN | CANCEL
  CONSTRAINT history_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_history_session ON public.history_logs(session_id);

-- =====================================================================
-- TRIGGER: updated_at otomatis
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_transporters_updated_at ON public.master_transporters;
CREATE TRIGGER trg_transporters_updated_at
  BEFORE UPDATE ON public.master_transporters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- TRIGGER: sesi WAJIB di-sign untuk close
-- Begitu 1 baris masuk ke handover_manifests, sorting_sessions otomatis CLOSED.
-- Ini satu-satunya jalan status berubah jadi CLOSED (tidak ada cara lain).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.close_session_on_manifest()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sorting_sessions
  SET status = 'CLOSED', closed_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_close_session_on_manifest ON public.handover_manifests;
CREATE TRIGGER trg_close_session_on_manifest
  AFTER INSERT ON public.handover_manifests
  FOR EACH ROW EXECUTE FUNCTION public.close_session_on_manifest();

-- =====================================================================
-- TRIGGER: cegah perubahan sorting_details setelah sesi CLOSED
-- Menjaga integritas data pasca tanda tangan — tidak boleh ada yang
-- diam-diam scan ulang / ubah status resi setelah berita acara final.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.prevent_edit_after_closed()
RETURNS TRIGGER AS $$
DECLARE
  v_status varchar(20);
BEGIN
  SELECT status INTO v_status FROM public.sorting_sessions WHERE id = NEW.session_id;
  IF v_status = 'CLOSED' THEN
    RAISE EXCEPTION 'Sesi % sudah CLOSED (sudah ditandatangani), tidak bisa diubah lagi.', NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_edit_after_closed ON public.sorting_details;
CREATE TRIGGER trg_prevent_edit_after_closed
  BEFORE UPDATE ON public.sorting_details
  FOR EACH ROW EXECUTE FUNCTION public.prevent_edit_after_closed();

-- =====================================================================
-- FUNCTION: process_auto_sorting
-- Dipanggil dari mobile Sorting — auto-detect transporter dari prefix,
-- auto-buat sesi RUNNING kalau belum ada punya operator ini hari ini.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.process_auto_sorting(
  p_barcode TEXT,
  p_operator_id UUID
) RETURNS JSON AS $$
DECLARE
  v_session_id UUID;
  v_session_code TEXT;
  v_transporter_id INT;
  v_transporter_name TEXT;
  v_date_str TEXT;
  v_seq_count INT;
  v_existing_resi RECORD;
  v_lock_key BIGINT;
BEGIN
  -- 1. Cek duplikat global (fast-path; constraint UNIQUE jadi pertahanan akhir)
  SELECT sd.session_id, ss.session_code, ss.status
  INTO v_existing_resi
  FROM public.sorting_details sd
  JOIN public.sorting_sessions ss ON ss.id = sd.session_id
  WHERE sd.barcode_resi = p_barcode
  LIMIT 1;

  IF v_existing_resi.session_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Resi sudah discan di session ' || v_existing_resi.session_code || ' (' || v_existing_resi.status || ')'
    );
  END IF;

  -- 2. Cari transporter — prefix paling spesifik (terpanjang) menang
  SELECT mt.id, mt.transporter_name
  INTO v_transporter_id, v_transporter_name
  FROM public.master_transporters mt
  CROSS JOIN LATERAL (
    SELECT MAX(length(trim(single_prefix))) AS match_len
    FROM unnest(string_to_array(mt.tracking_prefix, ',')) AS single_prefix
    WHERE p_barcode LIKE trim(single_prefix) || '%'
  ) matched
  WHERE mt.is_active = true
    AND matched.match_len IS NOT NULL
  ORDER BY matched.match_len DESC
  LIMIT 1;

  IF v_transporter_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Prefix resi tidak terdaftar di master transporter.');
  END IF;

  v_date_str := to_char(CURRENT_DATE, 'DDMMYY');

  -- 3. Lock supaya 2 request bersamaan tidak bikin 2 sesi/session_code sama
  v_lock_key := hashtextextended(
    p_operator_id::TEXT || '-' || v_transporter_id::TEXT || '-' || v_date_str, 0
  );
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 4. Cari sesi RUNNING milik operator+transporter ini hari ini
  SELECT id, session_code INTO v_session_id, v_session_code
  FROM public.sorting_sessions
  WHERE operator_id = p_operator_id
    AND transporter_id = v_transporter_id
    AND status = 'RUNNING'
    AND created_at::DATE = CURRENT_DATE
  LIMIT 1;

  IF v_session_id IS NULL THEN
    SELECT COUNT(*) + 1 INTO v_seq_count
    FROM public.sorting_sessions
    WHERE transporter_id = v_transporter_id AND created_at::DATE = CURRENT_DATE;

    v_session_code := lower(regexp_replace(v_transporter_name, '[^a-zA-Z0-9]', '', 'g'))
      || v_date_str || '-' || lpad(v_seq_count::TEXT, 3, '0');

    INSERT INTO public.sorting_sessions (session_code, operator_id, transporter_id, status)
    VALUES (v_session_code, p_operator_id, v_transporter_id, 'RUNNING')
    RETURNING id INTO v_session_id;
  END IF;

  -- 5. Insert resi
  INSERT INTO public.sorting_details (session_id, barcode_resi, sorting_by)
  VALUES (v_session_id, p_barcode, p_operator_id);

  RETURN json_build_object(
    'success', true,
    'message', 'Resi berhasil disortir ke sesi ' || v_session_code,
    'session_code', v_session_code,
    'transporter', v_transporter_name
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'message', 'Resi sudah discan (terdeteksi bersamaan).');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION: process_handover_scan
-- Dipanggil dari mobile Handover — validasi 1 resi terhadap sesi tertentu.
-- Bisa dipanggil KAPAN SAJA selama sesi RUNNING (paralel dengan sorting).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.process_handover_scan(
  p_barcode TEXT,
  p_session_id UUID,
  p_operator_id UUID
) RETURNS JSON AS $$
DECLARE
  v_detail RECORD;
  v_session_status TEXT;
BEGIN
  SELECT status INTO v_session_status FROM public.sorting_sessions WHERE id = p_session_id;

  IF v_session_status IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Sesi tidak ditemukan.');
  END IF;

  IF v_session_status = 'CLOSED' THEN
    RETURN json_build_object('success', false, 'message', 'Sesi ini sudah CLOSED (sudah ditandatangani).');
  END IF;

  SELECT id, is_validated_handover INTO v_detail
  FROM public.sorting_details
  WHERE session_id = p_session_id AND barcode_resi = p_barcode;

  IF v_detail.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Resi tidak ditemukan di sesi ini.');
  END IF;

  IF v_detail.is_validated_handover THEN
    RETURN json_build_object('success', false, 'message', 'Resi ini sudah divalidasi sebelumnya.');
  END IF;

  UPDATE public.sorting_details
  SET is_validated_handover = true, validated_by = p_operator_id, validated_at = now()
  WHERE id = v_detail.id;

  RETURN json_build_object('success', true, 'message', 'Resi tervalidasi.');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION: finalize_handover
-- SATU pemanggilan atomic untuk menutup sesi:
--   - tandai resi exception (yang belum tervalidasi) dengan alasannya
--   - insert manifest (otomatis men-trigger CLOSED lewat trigger di atas)
--   - insert history_logs untuk semua resi (arsip)
-- p_exceptions: jsonb array, contoh: [{"id":"<uuid>","reason":"NOT_FOUND"}, ...]
-- =====================================================================
CREATE OR REPLACE FUNCTION public.finalize_handover(
  p_session_id UUID,
  p_courier_name TEXT,
  p_security_name TEXT,
  p_courier_signature TEXT,
  p_security_signature TEXT,
  p_operator_id UUID,
  p_exceptions JSONB DEFAULT '[]'::jsonb
) RETURNS JSON AS $$
DECLARE
  v_session RECORD;
  v_exc JSONB;
  v_matched_count INT;
  v_exception_count INT;
BEGIN
  SELECT ss.id, ss.session_code, ss.status, mt.transporter_name
  INTO v_session
  FROM public.sorting_sessions ss
  JOIN public.master_transporters mt ON mt.id = ss.transporter_id
  WHERE ss.id = p_session_id;

  IF v_session.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Sesi tidak ditemukan.');
  END IF;

  IF v_session.status = 'CLOSED' THEN
    RETURN json_build_object('success', false, 'message', 'Sesi ini sudah CLOSED sebelumnya.');
  END IF;

  -- Tandai tiap resi exception dengan alasannya masing-masing
  FOR v_exc IN SELECT * FROM jsonb_array_elements(p_exceptions)
  LOOP
    UPDATE public.sorting_details
    SET is_validated_handover = true,
        validated_by = p_operator_id,
        validated_at = now(),
        discrepancy_reason = (v_exc->>'reason')
    WHERE id = (v_exc->>'id')::uuid AND session_id = p_session_id;
  END LOOP;

  v_exception_count := jsonb_array_length(p_exceptions);

  SELECT COUNT(*) INTO v_matched_count
  FROM public.sorting_details
  WHERE session_id = p_session_id AND discrepancy_reason IS NULL;

  -- Insert manifest -> trigger otomatis set sorting_sessions.status = 'CLOSED'
  INSERT INTO public.handover_manifests (
    session_id, courier_name, security_name,
    courier_signature, security_signature,
    total_packages_handed, total_discrepancy, handover_by
  ) VALUES (
    p_session_id, p_courier_name, p_security_name,
    p_courier_signature, p_security_signature,
    v_matched_count, v_exception_count, p_operator_id
  );

  -- Arsip semua resi ke history_logs
  INSERT INTO public.history_logs (
    session_id, session_code, transporter_name, resi_number,
    sorting_at, sorting_by, handover_by, status
  )
  SELECT
    sd.session_id,
    v_session.session_code,
    v_session.transporter_name,
    sd.barcode_resi,
    sd.scanned_at,
    u_sort.full_name,
    p_courier_name,
    CASE
      WHEN sd.discrepancy_reason = 'CANCELLED' THEN 'CANCEL'
      WHEN sd.discrepancy_reason = 'NOT_FOUND' THEN 'TIDAK DITEMUKAN'
      ELSE 'DONE'
    END
  FROM public.sorting_details sd
  LEFT JOIN public.users u_sort ON u_sort.id = sd.sorting_by
  WHERE sd.session_id = p_session_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Handover selesai & sesi ditutup.',
    'matched', v_matched_count,
    'exceptions', v_exception_count
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'message', 'Sesi ini sudah punya manifest (sudah pernah di-sign).');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- SEED DATA CONTOH (opsional, hapus/edit sesuai kebutuhan)
-- =====================================================================
INSERT INTO public.master_transporters (transporter_name, tracking_prefix)
VALUES
  ('J&T', 'JX,JT'),
  ('JNE', 'JNE,JD'),
  ('SiCepat', 'SICEPAT,SPX')
ON CONFLICT DO NOTHING;
