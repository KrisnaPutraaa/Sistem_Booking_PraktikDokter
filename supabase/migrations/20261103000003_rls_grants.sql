-- Fase 2, langkah 3: RLS dan hak akses (bagian 5.3).
-- Project memakai "Automatically expose new tables" mati, jadi tidak ada hak
-- bawaan. Setiap hak di bawah ini diberikan eksplisit (default-deny).

alter table public.profiles enable row level security;
alter table public.practice_settings enable row level security;
alter table public.closed_days enable row level security;
alter table public.daily_counters enable row level security;
alter table public.queue_entries enable row level security;

-- Mulai dari nol, terlepas dari setelan project.
revoke all on table
  public.profiles, public.practice_settings, public.closed_days,
  public.daily_counters, public.queue_entries
from public, anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;

-- Policy -----------------------------------------------------------------
-- (select ...) membuat fungsi dievaluasi sekali per query, bukan per baris.

-- Profil: lihat milik sendiri; owner melihat semua. Tidak ada policy tulis:
-- profil diisi pemilik lewat SQL Editor.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.current_app_role()) = 'owner');

-- Pengaturan: info publik, boleh dibaca siapa pun; diubah dokter dan owner.
create policy settings_select on public.practice_settings
  for select to anon, authenticated
  using (true);

create policy settings_update on public.practice_settings
  for update to authenticated
  using ((select public.current_app_role()) in ('doctor', 'owner'))
  with check ((select public.current_app_role()) in ('doctor', 'owner'));

-- Hari libur: dibaca siapa pun; dikelola dokter dan owner.
create policy closed_days_select on public.closed_days
  for select to anon, authenticated
  using (true);

create policy closed_days_insert on public.closed_days
  for insert to authenticated
  with check ((select public.current_app_role()) in ('doctor', 'owner'));

create policy closed_days_update on public.closed_days
  for update to authenticated
  using ((select public.current_app_role()) in ('doctor', 'owner'))
  with check ((select public.current_app_role()) in ('doctor', 'owner'));

create policy closed_days_delete on public.closed_days
  for delete to authenticated
  using ((select public.current_app_role()) in ('doctor', 'owner'));

-- Antrean: hanya staf. Tidak ada policy insert/delete; pasien online dan
-- walk-in sama-sama lewat take_queue.
create policy queue_entries_select on public.queue_entries
  for select to authenticated
  using ((select public.current_app_role()) in ('nurse', 'doctor', 'owner'));

create policy queue_entries_update on public.queue_entries
  for update to authenticated
  using ((select public.current_app_role()) in ('nurse', 'doctor', 'owner'))
  with check ((select public.current_app_role()) in ('nurse', 'doctor', 'owner'));

-- daily_counters: tanpa policy, tertutup untuk anon dan authenticated.

-- Hak tabel -------------------------------------------------------------

grant select on public.practice_settings, public.closed_days to anon;

grant select on public.profiles to authenticated;
grant select, update on public.practice_settings to authenticated;
grant select, insert, update, delete on public.closed_days to authenticated;
grant select on public.queue_entries to authenticated;
-- Staf hanya mengubah status. Waktu dan jumlah panggilan diisi trigger
-- queue_entries_status_guard, jadi kolom itu tidak perlu hak update.
grant update (status) on public.queue_entries to authenticated;

-- service_role (kunci secret, server saja) melewati RLS. Diberi hak tabel
-- penuh untuk skrip pemeliharaan dan pembersihan data uji.
grant select, insert, update, delete on
  public.profiles, public.practice_settings, public.closed_days,
  public.daily_counters, public.queue_entries
to service_role;
