-- Fase 6: keamanan dan privasi (keputusan pemilik, 4 November 2026).
-- 1. Schema private dan kunci HMAC: nilai yang di-hash (IP, email, kode
--    pemulihan) tidak pernah disimpan mentah.
-- 2. Batas percobaan per kunci (hit_rate_limit), hanya service_role.
-- 3. Verifikasi dua langkah: owner dan dokter wajib aal2 di level database;
--    perawat aal1 kecuali sudah memasang faktor sendiri. Kode pemulihan disimpan
--    sebagai HMAC. Akun staf bisa dinonaktifkan (disabled_at).
-- 4. Anonimkan data pasien: atas permintaan (owner) dan otomatis setelah N bulan
--    (pengaturan opsional, bawaan mati). Baris tetap ada untuk rekap; nama,
--    WhatsApp, keluhan dihapus dan token pasien diganti.
-- 5. Audit untuk kejadian keamanan tanpa data pribadi.
-- 6. Pemeliharaan harian lewat pg_cron (03.00 WITA).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;

-- 1. Schema private ----------------------------------------------------------

-- Tidak diekspos PostgREST dan tanpa hak untuk peran API mana pun. Hanya
-- diakses fungsi security definer di schema public.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create table private.app_secrets (
  name text primary key,
  value bytea not null
);
alter table private.app_secrets enable row level security;
revoke all on table private.app_secrets from public, anon, authenticated, service_role;

-- 256 bit acak, dibuat sekali per project (dev dan produksi berbeda).
insert into private.app_secrets (name, value) values ('hmac_key', extensions.gen_random_bytes(32));

create function private.keyed_hash(p_value text)
returns text
language sql
stable
set search_path = ''
as $$
  select encode(extensions.hmac(convert_to(p_value, 'UTF8'), s.value, 'sha256'), 'hex')
  from private.app_secrets s
  where s.name = 'hmac_key'
$$;

revoke all on function private.keyed_hash(text) from public, anon, authenticated, service_role;

-- 2. Batas percobaan ---------------------------------------------------------

-- Jendela tetap per bucket. key_hash = HMAC(bucket:kunci); IP atau email tidak
-- disimpan. Baris lebih tua dari 2 hari dihapus pemeliharaan harian.
create table private.rate_limit_hits (
  bucket text not null,
  key_hash text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket, key_hash, window_start)
);
alter table private.rate_limit_hits enable row level security;
revoke all on table private.rate_limit_hits from public, anon, authenticated, service_role;

-- True bila percobaan ini masih dalam batas. Setiap panggilan dihitung.
create function public.hit_rate_limit(p_bucket text, p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_start timestamptz;
  v_hits int;
begin
  if p_bucket is null or p_bucket !~ '^[a-z_]{1,40}$'
     or p_key is null or char_length(p_key) not between 1 and 320
     or p_max is null or p_max not between 1 and 10000
     or p_window_seconds is null or p_window_seconds not between 10 and 86400 then
    raise exception 'RATE_LIMIT_INVALID';
  end if;

  v_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into private.rate_limit_hits as h (bucket, key_hash, window_start, hits)
  values (p_bucket, private.keyed_hash(p_bucket || ':' || p_key), v_start, 1)
  on conflict (bucket, key_hash, window_start) do update set hits = h.hits + 1
  returning h.hits into v_hits;

  return v_hits <= p_max;
end
$$;

revoke all on function public.hit_rate_limit(text, text, int, int) from public, anon, authenticated, service_role;
grant execute on function public.hit_rate_limit(text, text, int, int) to service_role;

-- 3. Verifikasi dua langkah dan akun staf ------------------------------------

alter table public.profiles add column disabled_at timestamptz;

create trigger profiles_audit
after insert or update or delete on public.profiles
for each row execute function public.write_audit();

-- Peran aplikasi untuk RLS. Null (tanpa akses) bila:
-- - akun dinonaktifkan;
-- - owner atau dokter belum memakai verifikasi dua langkah (aal2) di sesi ini;
-- - perawat yang sudah memasang faktor TOTP tetapi sesi ini belum aal2.
-- Jadi kata sandi saja tidak cukup untuk owner dan dokter, juga lewat API langsung.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.disabled_at is null
    and (
      coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
      or (
        p.role = 'nurse'
        and not exists (
          select 1 from auth.mfa_factors f
          where f.user_id = p.id and f.status = 'verified'
        )
      )
    )
$$;

revoke all on function public.current_app_role() from public, anon, authenticated, service_role;
grant execute on function public.current_app_role() to authenticated;

-- Kode pemulihan: 10 karakter A-Z0-9, sekali pakai, disimpan sebagai HMAC.
create table private.mfa_recovery_codes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  unique (user_id, code_hash)
);
alter table private.mfa_recovery_codes enable row level security;
revoke all on table private.mfa_recovery_codes from public, anon, authenticated, service_role;

create function public.replace_recovery_codes(p_user uuid, p_codes text[])
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if p_user is null or p_codes is null or cardinality(p_codes) not between 1 and 20
     or exists (select 1 from unnest(p_codes) c where c is null or c !~ '^[A-Z0-9]{10}$') then
    raise exception 'RECOVERY_CODES_INVALID';
  end if;

  delete from private.mfa_recovery_codes where user_id = p_user;
  insert into private.mfa_recovery_codes (user_id, code_hash)
  select distinct p_user, private.keyed_hash('recovery:' || c) from unnest(p_codes) c;
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

-- True bila kode cocok dan belum dipakai; kode langsung ditandai terpakai.
create function public.consume_recovery_code(p_user uuid, p_code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_id bigint;
begin
  if p_user is null or v_code !~ '^[A-Z0-9]{10}$' then
    return false;
  end if;

  update private.mfa_recovery_codes r
  set used_at = now()
  where r.user_id = p_user
    and r.code_hash = private.keyed_hash('recovery:' || v_code)
    and r.used_at is null
  returning r.id into v_id;

  return v_id is not null;
end
$$;

create function public.delete_recovery_codes(p_user uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from private.mfa_recovery_codes where user_id = p_user
$$;

create function public.recovery_codes_remaining(p_user uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from private.mfa_recovery_codes where user_id = p_user and used_at is null
$$;

revoke all on function public.replace_recovery_codes(uuid, text[]) from public, anon, authenticated, service_role;
revoke all on function public.consume_recovery_code(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.delete_recovery_codes(uuid) from public, anon, authenticated, service_role;
revoke all on function public.recovery_codes_remaining(uuid) from public, anon, authenticated, service_role;
grant execute on function public.replace_recovery_codes(uuid, text[]) to service_role;
grant execute on function public.consume_recovery_code(uuid, text) to service_role;
grant execute on function public.delete_recovery_codes(uuid) to service_role;
grant execute on function public.recovery_codes_remaining(uuid) to service_role;

-- Kejadian keamanan dari Server Action (service_role, setelah peran diperiksa):
-- mfa.*, account.*. Isi data hanya id akun staf dan hitungan, tanpa data pasien.
create function public.log_staff_event(p_actor uuid, p_action text, p_data jsonb default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_action is null or p_action !~ '^(mfa|account)\.[a-z_]{1,40}$' then
    raise exception 'AUDIT_ACTION_INVALID';
  end if;
  insert into public.audit_log (actor, action, new_data) values (p_actor, p_action, p_data);
end
$$;

revoke all on function public.log_staff_event(uuid, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.log_staff_event(uuid, text, jsonb) to service_role;

-- 4. Anonimkan data pasien ---------------------------------------------------

alter table public.queue_entries add column anonymized_at timestamptz;
alter table public.queue_entries alter column whatsapp drop not null;
alter table public.queue_entries
  add constraint queue_entries_anonymized_consistent
    check ((anonymized_at is null) = (whatsapp is not null));

-- Null = mati (bawaan, keputusan dokter: simpan tanpa batas waktu otomatis).
alter table public.practice_settings
  add column anonymize_after_months int
    constraint anonymize_after_months_range check (anonymize_after_months between 1 and 120);

-- Nomor WhatsApp praktik (kontak di halaman Kebijakan Privasi), sudah dinormalisasi.
alter table public.practice_settings
  add constraint practice_whatsapp_format check (whatsapp is null or whatsapp ~ '^62[0-9]{8,13}$');

-- Penjaga perubahan queue_entries. Aturan Fase 5 tetap. Tambahan:
-- - mengisi anonymized_at (hanya fungsi security definer; authenticated tidak
--   punya hak kolom ini) menghapus nama, WhatsApp, keluhan, dan mengganti token
--   pasien, sehingga tautan nomor antrean lama tidak berlaku lagi;
-- - anonimisasi tidak bisa dibatalkan dan nama baris anonim tidak bisa diubah.
create or replace function public.queue_entries_status_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_is_staff_session boolean := auth.uid() is not null;
  v_role text := '';
begin
  if v_is_staff_session then
    v_role := coalesce(public.current_app_role()::text, '');
  end if;

  if new.id is distinct from old.id
     or new.queue_date is distinct from old.queue_date
     or new.number is distinct from old.number
     or new.public_token is distinct from old.public_token
     or new.source is distinct from old.source
     or new.consent_at is distinct from old.consent_at
     or new.created_at is distinct from old.created_at then
    raise exception 'IMMUTABLE_COLUMN';
  end if;

  new.called_at := old.called_at;
  new.finished_at := old.finished_at;
  new.call_count := old.call_count;

  if new.anonymized_at is distinct from old.anonymized_at then
    if old.anonymized_at is not null or new.anonymized_at is null then
      raise exception 'ANONYMIZE_IRREVERSIBLE';
    end if;
    if new.status is distinct from old.status
       or new.fee_rupiah is distinct from old.fee_rupiah
       or new.name is distinct from old.name then
      raise exception 'ANONYMIZE_WITH_OTHER_CHANGE';
    end if;
    new.name := 'Data dihapus';
    new.whatsapp := null;
    new.complaint := null;
    new.public_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    return new;
  end if;

  if new.whatsapp is distinct from old.whatsapp or new.complaint is distinct from old.complaint then
    raise exception 'IMMUTABLE_COLUMN';
  end if;

  if new.name is distinct from old.name then
    new.name := btrim(new.name);
  end if;

  if new.name is distinct from old.name then
    if old.anonymized_at is not null then
      raise exception 'ANONYMIZED';
    end if;
    if new.status is distinct from old.status or new.fee_rupiah is distinct from old.fee_rupiah then
      raise exception 'NAME_WITH_OTHER_CHANGE';
    end if;
    if v_is_staff_session and v_role not in ('doctor', 'owner') then
      raise exception 'NAME_NOT_ALLOWED';
    end if;
    return new;
  end if;

  if new.fee_rupiah is distinct from old.fee_rupiah then
    if new.status is distinct from old.status then
      raise exception 'FEE_WITH_STATUS_CHANGE';
    end if;
    if v_is_staff_session and v_role not in ('nurse', 'doctor', 'owner') then
      raise exception 'FEE_NOT_ALLOWED';
    end if;
    if new.fee_rupiah is not null and old.status = 'no_show' then
      raise exception 'FEE_NO_SHOW';
    end if;
    return new;
  end if;

  if new.status = 'in_progress' and old.status in ('waiting', 'in_progress') then
    new.called_at := now();
    new.call_count := old.call_count + 1;
  elsif new.status = old.status then
    null;
  elsif old.status = 'in_progress' and new.status = 'done' then
    new.finished_at := now();
  elsif old.status = 'in_progress' and new.status = 'waiting' then
    null;
  elsif old.status in ('waiting', 'in_progress') and new.status = 'no_show' then
    null;
  elsif old.status = 'no_show' and new.status = 'waiting' then
    new.call_count := 0;
  elsif old.status = 'done' and new.status = 'in_progress' then
    if v_is_staff_session and v_role not in ('doctor', 'owner') then
      raise exception 'REVERT_NOT_ALLOWED';
    end if;
    new.finished_at := null;
  else
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  return new;
end
$$;

revoke all on function public.queue_entries_status_guard() from public, anon, authenticated, service_role;

-- Hapus atas permintaan pasien: hanya owner (aal2, lewat current_app_role).
-- Antrean yang masih menunggu atau diperiksa ditolak: selesaikan atau tandai
-- tidak hadir dulu. Audit: satu baris queue_entries.update per antrean (tanpa
-- kolom pribadi) ditambah ringkasan jumlah.
create function public.erase_queue_entries(p_ids uuid[])
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_count int;
begin
  if v_actor is null or public.current_app_role() is distinct from 'owner' then
    raise exception 'ERASE_NOT_ALLOWED';
  end if;
  if p_ids is null or cardinality(p_ids) not between 1 and 200 then
    raise exception 'ERASE_INVALID';
  end if;
  if exists (
    select 1 from public.queue_entries q
    where q.id = any (p_ids) and q.anonymized_at is null and q.status in ('waiting', 'in_progress')
  ) then
    raise exception 'ERASE_ACTIVE_ENTRY';
  end if;

  update public.queue_entries q
  set anonymized_at = now()
  where q.id = any (p_ids) and q.anonymized_at is null;
  get diagnostics v_count = row_count;

  insert into public.audit_log (actor, action, new_data)
  values (v_actor, 'privacy.erase_on_request', jsonb_build_object('count', v_count));

  return v_count;
end
$$;

revoke all on function public.erase_queue_entries(uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.erase_queue_entries(uuid[]) to authenticated;

-- Anonimkan otomatis antrean yang lebih tua dari N bulan (WITA). Tidak
-- melakukan apa pun bila pengaturan mati (null).
create function public.anonymize_expired()
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_months int;
  v_before date;
  v_count int;
begin
  select s.anonymize_after_months into v_months from public.practice_settings s where s.id = 1;
  if v_months is null then
    return 0;
  end if;

  v_before := ((now() at time zone 'Asia/Makassar')::date - make_interval(months => v_months))::date;
  perform set_config('app.actor', '', true);

  update public.queue_entries q
  set anonymized_at = now()
  where q.anonymized_at is null and q.queue_date < v_before;
  get diagnostics v_count = row_count;

  if v_count > 0 then
    insert into public.audit_log (actor, action, new_data)
    values (null, 'privacy.auto_anonymize',
            jsonb_build_object('count', v_count, 'months', v_months, 'before', v_before));
  end if;
  return v_count;
end
$$;

revoke all on function public.anonymize_expired() from public, anon, authenticated, service_role;
grant execute on function public.anonymize_expired() to service_role;

-- 6. Pemeliharaan harian -----------------------------------------------------

create function public.run_daily_maintenance()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.anonymize_expired();
  delete from private.rate_limit_hits where window_start < now() - interval '2 days';
end
$$;

revoke all on function public.run_daily_maintenance() from public, anon, authenticated, service_role;

-- 19.00 UTC = 03.00 WITA. Nama tetap, sehingga menjalankan ulang hanya memperbarui jadwal.
select cron.schedule('praktik-pemeliharaan-harian', '0 19 * * *', 'select public.run_daily_maintenance()');
