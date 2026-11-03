-- Fase 2, langkah 2: fungsi database dan trigger.
-- Semua fungsi security definer memakai search_path kosong dan nama tabel lengkap.
-- Hak EXECUTE diatur di bagian akhir file: Postgres memberi EXECUTE ke PUBLIC
-- secara bawaan, jadi setiap fungsi dicabut dulu lalu diberikan eksplisit.

-- Peran staf yang sedang login. Tanpa parameter, sehingga staf tidak bisa
-- menanyakan peran pengguna lain.
create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

-- Pembuat nomor antrean (bagian 5.2). Satu transaksi: baris daily_counters
-- terkunci sampai selesai, sehingga permintaan bersamaan tidak mendapat nomor
-- sama. Setiap exception membatalkan seluruh transaksi termasuk kenaikan counter.
-- p_actor: id staf untuk walk-in (diperiksa Server Action), dicatat di audit log.
create function public.take_queue(
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
  -- Batas pendaftaran hanya untuk pasien online; walk-in tetap boleh setelahnya.
  if p_source = 'online' and p_date = today
     and s.cutoff_time is not null and now_local > s.cutoff_time then
    raise exception 'REGISTRATION_CLOSED';
  end if;

  -- Kunci baris tanggal ini lebih dulu, baru hitung nomor WhatsApp yang sama.
  -- Urutan ini mencegah dua permintaan bersamaan dari satu nomor sama-sama lolos.
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

  -- Dibaca trigger audit dalam transaksi yang sama (is_local = true).
  perform set_config('app.actor', coalesce(p_actor::text, ''), true);

  insert into public.queue_entries (queue_date, number, name, whatsapp, complaint, source, consent_at)
  values (p_date, n, trim(p_name), p_whatsapp, nullif(trim(p_complaint), ''), p_source, now())
  returning public_token into tok;

  return query
  select tok, n, p_date, (s.open_time + make_interval(mins => (n - 1) * s.avg_minutes))::time;
end
$$;

-- Halaman nomor antrean pasien (berdasarkan token). Tanpa nama pasien lain.
-- Token tidak dikenal menghasilkan nol baris, bukan error.
create function public.get_my_queue(p_token text)
returns table (
  out_number int,
  out_queue_date date,
  out_status public.queue_status,
  out_est_time time,
  out_now_serving int,
  out_waiting_ahead int
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    q.number,
    q.queue_date,
    q.status,
    (s.open_time + make_interval(mins => (q.number - 1) * s.avg_minutes))::time,
    (
      select c.number from public.queue_entries c
      where c.queue_date = q.queue_date and c.status = 'in_progress'
      order by c.called_at desc nulls last, c.number desc
      limit 1
    ),
    case when q.status = 'waiting' then (
      select count(*)::int from public.queue_entries w
      where w.queue_date = q.queue_date and w.status = 'waiting' and w.number < q.number
    ) else 0 end
  from public.queue_entries q
  cross join public.practice_settings s
  where p_token ~ '^[0-9a-f]{64}$'
    and q.public_token = p_token
    and s.id = 1
$$;

-- Layar Pilih hari: per tanggal dalam jangkauan, status dan sisa kuota.
-- Status: available, full, holiday (closed_days), closed (bukan hari praktik),
-- registration_closed (hari ini setelah batas pendaftaran).
create function public.get_availability()
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
      when d.day = t.today and s.cutoff_time is not null and t.now_local > s.cutoff_time
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

-- Antrean berjalan: hanya nomor yang sedang diperiksa, tanpa nama.
create function public.get_now_serving(p_date date default null)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select q.number from public.queue_entries q
  where q.queue_date = coalesce(p_date, (now() at time zone 'Asia/Makassar')::date)
    and q.status = 'in_progress'
  order by q.called_at desc nulls last, q.number desc
  limit 1
$$;

-- Penjaga perubahan status. called_at, finished_at, dan call_count hanya diisi
-- di sini, sehingga staf cukup diberi hak update kolom status.
-- Transisi yang sah:
--   waiting     -> in_progress  (Panggil; call_count + 1)
--   waiting     -> no_show
--   in_progress -> in_progress  (Panggil lagi; call_count + 1)
--   in_progress -> done         (Selesai)
--   in_progress -> waiting      (belum datang, dilewati sementara)
--   in_progress -> no_show
--   no_show     -> waiting      (disisipkan kembali; call_count mulai dari 0)
-- done bersifat akhir.
create function public.queue_entries_status_guard()
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

create trigger queue_entries_status_guard
before update on public.queue_entries
for each row execute function public.queue_entries_status_guard();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger practice_settings_updated_at
before update on public.practice_settings
for each row execute function public.set_updated_at();

-- Hak EXECUTE (default-deny).
revoke all on function public.current_app_role() from public, anon, authenticated, service_role;
revoke all on function public.take_queue(date, text, text, text, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_my_queue(text) from public, anon, authenticated, service_role;
revoke all on function public.get_availability() from public, anon, authenticated, service_role;
revoke all on function public.get_now_serving(date) from public, anon, authenticated, service_role;
revoke all on function public.queue_entries_status_guard() from public, anon, authenticated, service_role;
revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;

-- Dipakai policy RLS untuk staf yang login.
grant execute on function public.current_app_role() to authenticated;

-- Aksi pasien dan walk-in: hanya lewat Server Action dengan service_role.
grant execute on function public.take_queue(date, text, text, text, text, uuid) to service_role;
grant execute on function public.get_my_queue(text) to service_role;
grant execute on function public.get_availability() to service_role;
grant execute on function public.get_now_serving(date) to service_role;
