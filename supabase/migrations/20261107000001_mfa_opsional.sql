-- Revisi Fase 6 (keputusan pemilik, 4 November 2026): verifikasi dua langkah
-- TIDAK wajib untuk peran mana pun. Alur MFA tetap ada sebagai opsi.
--
-- 1. Saklar private.security_settings.mfa_wajib (bawaan false). Bila
--    dinyalakan, owner dan dokter kembali wajib aal2 seperti Fase 6 awal.
--    Disimpan di schema private (bukan practice_settings) supaya tidak bisa
--    dibaca anon dan tidak bisa diubah lewat API oleh dokter atau owner;
--    hanya lewat SQL Editor.
-- 2. current_app_role(): aal1 cukup, kecuali akun itu sendiri sudah memasang
--    faktor TOTP (berlaku untuk semua peran) atau saklar mfa_wajib menyala
--    untuk owner dan dokter.

create table private.security_settings (
  id int primary key default 1 check (id = 1),
  mfa_wajib boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table private.security_settings enable row level security;
revoke all on table private.security_settings from public, anon, authenticated, service_role;

insert into private.security_settings (id) values (1);

-- Dibaca aplikasi untuk tampilan dan pengalihan ke /staf/mfa. Penegakan tetap
-- di current_app_role().
create function public.mfa_wajib()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.mfa_wajib from private.security_settings s where s.id = 1), false)
$$;

revoke all on function public.mfa_wajib() from public, anon, authenticated, service_role;
grant execute on function public.mfa_wajib() to authenticated, service_role;

-- Peran aplikasi untuk RLS. Null (tanpa akses) bila:
-- - akun dinonaktifkan;
-- - akun sudah memasang faktor TOTP tetapi sesi ini belum aal2;
-- - saklar mfa_wajib menyala, peran owner atau dokter, dan sesi belum aal2.
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
        not exists (
          select 1 from auth.mfa_factors f
          where f.user_id = p.id and f.status = 'verified'
        )
        and not (
          p.role in ('owner', 'doctor')
          and coalesce((select s.mfa_wajib from private.security_settings s where s.id = 1), false)
        )
      )
    )
$$;

revoke all on function public.current_app_role() from public, anon, authenticated, service_role;
grant execute on function public.current_app_role() to authenticated;
