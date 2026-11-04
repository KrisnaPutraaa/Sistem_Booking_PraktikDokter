-- Fase 5: riwayat, rekap, koreksi, pengaturan (keputusan pemilik, 4 November 2026).
-- 1. Koreksi nama pasien: hanya dokter dan owner. Audit log mencatat bahwa nama
--    berubah (name_changed), tanpa nama lama atau baru.
-- 2. Mengembalikan status "done" ke "in_progress": hanya dokter dan owner.
-- 3. Rekap per hari (get_daily_recap). Total tarif hanya untuk dokter dan owner.
-- 4. Constraint pengaturan tambahan.

-- 1 dan 2. Penjaga perubahan queue_entries -----------------------------------

grant update (status, fee_rupiah, name) on public.queue_entries to authenticated;

-- Aturan Fase 4 tetap. Tambahan:
-- - nama hanya diubah dokter, owner, atau service_role; berdiri sendiri (status
--   dan tarif tidak ikut berubah); spasi di tepi dibuang (panjang dijaga check tabel);
-- - done -> in_progress hanya dokter, owner, atau service_role. finished_at
--   dikosongkan, called_at dan call_count tetap (bukan panggilan baru).
create or replace function public.queue_entries_status_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_is_staff_session boolean := auth.uid() is not null;
  v_role text := '';
begin
  -- current_app_role() hanya bisa dieksekusi authenticated, bukan service_role.
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

  if new.name is distinct from old.name then
    new.name := btrim(new.name);
  end if;

  if new.name is distinct from old.name then
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

-- Audit: kolom pribadi tetap tidak disalin. Untuk queue_entries, perubahan nama
-- ditandai name_changed = true di new_data.
create or replace function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(auth.uid(), nullif(current_setting('app.actor', true), '')::uuid);
  v_hidden text[] := '{}';
  v_old jsonb;
  v_new jsonb;
  v_entry uuid;
begin
  if tg_table_name = 'queue_entries' then
    v_hidden := array['name', 'whatsapp', 'complaint', 'public_token'];
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old) - v_hidden;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new) - v_hidden;
  end if;

  if tg_table_name = 'queue_entries' then
    v_entry := coalesce(v_new, v_old) ->> 'id';
    if tg_op = 'UPDATE' and (to_jsonb(new) ->> 'name') is distinct from (to_jsonb(old) ->> 'name') then
      v_new := v_new || jsonb_build_object('name_changed', true);
    end if;
  end if;

  insert into public.audit_log (actor, action, entry_id, old_data, new_data)
  values (v_actor, tg_table_name || '.' || lower(tg_op), v_entry, v_old, v_new);

  return null;
end
$$;

revoke all on function public.write_audit() from public, anon, authenticated, service_role;

-- 3. Rekap per hari -----------------------------------------------------------

-- security invoker: RLS queue_entries_select tetap berlaku (hanya staf).
-- Hanya tanggal yang punya antrean. Rentang paling panjang 92 hari.
-- out_total_fee null untuk perawat. Durasi = finished_at - called_at (panggilan
-- terakhir) untuk pasien selesai; out_timed = jumlah pasien yang punya durasi.
create function public.get_daily_recap(p_from date, p_to date)
returns table (
  out_date date,
  out_total int,
  out_done int,
  out_no_show int,
  out_open int,
  out_timed int,
  out_avg_minutes numeric,
  out_total_fee bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_show_fee boolean := false;
begin
  if auth.uid() is not null then
    v_show_fee := coalesce(public.current_app_role()::text, '') in ('doctor', 'owner');
  end if;

  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 91 then
    raise exception 'RANGE_INVALID';
  end if;

  return query
  select
    q.queue_date,
    count(*)::int,
    (count(*) filter (where q.status = 'done'))::int,
    (count(*) filter (where q.status = 'no_show'))::int,
    (count(*) filter (where q.status in ('waiting', 'in_progress')))::int,
    (count(*) filter (where q.status = 'done' and q.called_at is not null and q.finished_at is not null))::int,
    round(
      (avg(extract(epoch from (q.finished_at - q.called_at)) / 60)
        filter (where q.status = 'done' and q.called_at is not null and q.finished_at is not null))::numeric,
      1
    ),
    case when v_show_fee then coalesce(sum(q.fee_rupiah), 0)::bigint end
  from public.queue_entries q
  where q.queue_date between p_from and p_to
  group by q.queue_date
  order by q.queue_date desc;
end
$$;

revoke all on function public.get_daily_recap(date, date) from public, anon, authenticated, service_role;
grant execute on function public.get_daily_recap(date, date) to authenticated;

-- 4. Pengaturan ---------------------------------------------------------------

-- Jam buka pendaftaran juga harus sebelum jam tutup praktik bila cutoff_time null.
alter table public.practice_settings
  add constraint registration_open_before_close check (registration_open_time < close_time);

alter table public.practice_settings
  add constraint emergency_notice_length
    check (emergency_notice is null or char_length(emergency_notice) between 1 and 500);
