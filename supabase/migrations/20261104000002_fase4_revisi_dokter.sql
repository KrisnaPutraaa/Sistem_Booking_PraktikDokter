-- Fase 4: revisi dokter (4 November 2026).
-- 1. Jam buka pendaftaran online (registration_open_time) sebagai pengaturan,
--    berpasangan dengan cutoff_time (jam tutup). Keduanya jam WITA.
-- 2. Imbauan darurat menjadi pengumuman opsional: bawaan kosong.
-- 3. Tarif per pasien (fee_rupiah), hanya untuk staf; perubahan masuk audit_log.

-- 1. Jendela pendaftaran ------------------------------------------------------

alter table public.practice_settings
  add column registration_open_time time not null default '00:00';

alter table public.practice_settings
  add constraint registration_window_order
    check (cutoff_time is null or registration_open_time < cutoff_time);

-- 2. Imbauan darurat ----------------------------------------------------------

alter table public.practice_settings alter column emergency_notice set default null;

-- Hanya dikosongkan bila masih teks bawaan lama; teks yang sudah diubah dibiarkan.
update public.practice_settings
set emergency_notice = null
where id = 1
  and emergency_notice =
    'Kondisi darurat (mimisan berat, sesak napas, benda asing di saluran napas): segera ke IGD.';

-- 3. Tarif per pasien ---------------------------------------------------------

-- Rupiah, bilangan bulat, opsional. Tidak pernah dikembalikan fungsi publik
-- (take_queue, get_my_queue, get_next_waiting, get_availability, get_now_serving
-- semuanya memilih kolom eksplisit). Tidak disembunyikan dari audit_log, sehingga
-- nilai lama dan baru tercatat; audit_log hanya bisa dibaca owner.
alter table public.queue_entries
  add column fee_rupiah integer check (fee_rupiah between 0 and 100000000);

-- Hak kolom berlaku untuk peran database "authenticated", bukan per peran aplikasi.
-- Pembatasan per peran dilakukan RLS (queue_entries_update: nurse, doctor, owner)
-- dan diperiksa lagi di trigger di bawah.
grant update (status, fee_rupiah) on public.queue_entries to authenticated;

-- Penjaga perubahan. Sama dengan Fase 2, ditambah aturan tarif:
-- - perubahan tarif harus berdiri sendiri (status tidak ikut berubah). Tanpa aturan
--   ini, mengisi tarif pada pasien "diperiksa" akan terhitung sebagai Panggil lagi;
-- - tarif hanya diisi oleh staf (nurse, doctor, owner) atau service_role;
-- - tarif tidak diisi untuk pasien tidak hadir (mengosongkan tetap boleh).
create or replace function public.queue_entries_status_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
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

  if new.fee_rupiah is distinct from old.fee_rupiah then
    if new.status is distinct from old.status then
      raise exception 'FEE_WITH_STATUS_CHANGE';
    end if;
    if auth.uid() is not null
       and coalesce(public.current_app_role()::text, '') not in ('nurse', 'doctor', 'owner') then
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
  else
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  return new;
end
$$;

revoke all on function public.queue_entries_status_guard() from public, anon, authenticated, service_role;

-- take_queue: pendaftaran online hari ini hanya antara registration_open_time
-- dan cutoff_time (WITA). Tepat pada jam tutup sudah ditutup (>=).
-- Walk-in tidak terikat jam pendaftaran. Tanda tangan dan hak EXECUTE tetap.
create or replace function public.take_queue(
  p_date date,
  p_name text,
  p_whatsapp text,
  p_complaint text,
  p_source text default 'online',
  p_actor uuid default null
)
returns table (out_token text, out_number int, out_queue_date date, out_est_time time)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  s public.practice_settings;
  today date := (now() at time zone 'Asia/Makassar')::date;
  now_local time := (now() at time zone 'Asia/Makassar')::time;
  n int;
  tok text;
  same_wa int;
begin
  if p_source is null or p_source not in ('online', 'walk_in') then
    raise exception 'INVALID_SOURCE';
  end if;

  select * into strict s from public.practice_settings where id = 1;

  if p_source = 'walk_in' then
    if not s.walk_in_enabled then
      raise exception 'WALK_IN_DISABLED';
    end if;
    if p_actor is null or not exists (select 1 from public.profiles p where p.id = p_actor) then
      raise exception 'ACTOR_REQUIRED';
    end if;
    -- Pasien walk-in sudah ada di tempat, jadi hanya untuk hari ini.
    if p_date is distinct from today then
      raise exception 'WALK_IN_TODAY_ONLY';
    end if;
  end if;

  if p_date is null or p_date < today or p_date > today + s.days_ahead then
    raise exception 'DATE_OUT_OF_RANGE';
  end if;
  if not (extract(isodow from p_date)::int = any (s.open_days)) then
    raise exception 'NOT_OPEN_DAY';
  end if;
  if exists (select 1 from public.closed_days d where d.day = p_date) then
    raise exception 'CLOSED_DAY';
  end if;
  -- Jam pendaftaran hanya untuk pasien online; walk-in tetap boleh di luarnya.
  if p_source = 'online' and p_date = today then
    if now_local < s.registration_open_time then
      raise exception 'REGISTRATION_NOT_OPEN';
    end if;
    if s.cutoff_time is not null and now_local >= s.cutoff_time then
      raise exception 'REGISTRATION_CLOSED';
    end if;
  end if;

  -- Kunci baris tanggal ini lebih dulu, baru hitung nomor WhatsApp yang sama.
  insert into public.daily_counters as c (queue_date, last_number)
  values (p_date, 1)
  on conflict (queue_date) do update set last_number = c.last_number + 1
  returning c.last_number into n;

  if n > s.daily_quota then
    raise exception 'FULL';
  end if;

  select count(*) into same_wa
  from public.queue_entries q
  where q.queue_date = p_date and q.whatsapp = p_whatsapp and q.status <> 'no_show';

  if same_wa >= s.max_per_whatsapp then
    raise exception 'TOO_MANY_FOR_NUMBER';
  end if;

  perform set_config('app.actor', coalesce(p_actor::text, ''), true);

  insert into public.queue_entries (queue_date, number, name, whatsapp, complaint, source, consent_at)
  values (p_date, n, trim(p_name), p_whatsapp, nullif(trim(p_complaint), ''), p_source, now())
  returning public_token into tok;

  return query
  select tok, n, p_date, (s.open_time + make_interval(mins => (n - 1) * s.avg_minutes))::time;
end
$$;

revoke all on function public.take_queue(date, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.take_queue(date, text, text, text, text, uuid) to service_role;

-- get_availability: status baru registration_not_open (hari ini, sebelum jam buka).
create or replace function public.get_availability()
returns table (out_date date, out_status text, out_remaining int, out_reason text)
language sql
stable
security definer
set search_path = ''
as $$
  with t as (
    select
      (now() at time zone 'Asia/Makassar')::date as today,
      (now() at time zone 'Asia/Makassar')::time as now_local
  )
  select
    d.day,
    case
      when not (extract(isodow from d.day)::int = any (s.open_days)) then 'closed'
      when cd.day is not null then 'holiday'
      when d.day = t.today and t.now_local < s.registration_open_time
        then 'registration_not_open'
      when d.day = t.today and s.cutoff_time is not null and t.now_local >= s.cutoff_time
        then 'registration_closed'
      when coalesce(c.last_number, 0) >= s.daily_quota then 'full'
      else 'available'
    end,
    greatest(s.daily_quota - coalesce(c.last_number, 0), 0),
    cd.reason
  from t
  cross join public.practice_settings s
  cross join lateral (
    select t.today + g as day from generate_series(0, s.days_ahead) g
  ) d
  left join public.closed_days cd on cd.day = d.day
  left join public.daily_counters c on c.queue_date = d.day
  where s.id = 1
  order by d.day
$$;

revoke all on function public.get_availability() from public, anon, authenticated;
grant execute on function public.get_availability() to service_role;
