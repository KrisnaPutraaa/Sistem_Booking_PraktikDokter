-- Fase 2, langkah 1: tipe, tabel, indeks, dan baris pengaturan.
-- Sumber: docs/Panduan bagian 5.1, ditambah keputusan di docs/catatan-fase-2.md.
-- Nilai bawaan practice_settings memakai jawaban dokter (3 November 2026):
-- buka 18.30, tutup paling lambat 23.00, kuota 15, rata-rata 15 menit.

create type public.app_role as enum ('owner', 'doctor', 'nurse');
create type public.queue_status as enum ('waiting', 'in_progress', 'done', 'no_show');

-- Akun staf. Baris diisi pemilik lewat SQL Editor (bagian 5.4), tidak lewat aplikasi.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 80),
  role public.app_role not null,
  created_at timestamptz not null default now()
);

-- Satu baris saja (id = 1). Semua angka di sini adalah pengaturan, bukan konstanta kode.
create table public.practice_settings (
  id int primary key default 1 check (id = 1),
  doctor_name text not null default 'dr. Luh Putu Dhena Purwaningsih, Sp.THT-KL',
  clinic_name text,
  address text,
  whatsapp text,
  profile_text text,
  -- Nilai sementara sampai dokter menyetujui teksnya. Null berarti imbauan tidak ditampilkan.
  emergency_notice text
    default 'Kondisi darurat (mimisan berat, sesak napas, benda asing di saluran napas): segera ke IGD.',
  daily_quota int not null default 15 check (daily_quota between 1 and 200),
  avg_minutes int not null default 15 check (avg_minutes between 1 and 120),
  open_time time not null default '18:30',
  close_time time not null default '23:00',             -- batas paling lambat praktik
  open_days int[] not null default '{1,2,3,4,5,6}'      -- ISO: 1 = Senin ... 7 = Minggu
    check (cardinality(open_days) >= 1 and open_days <@ '{1,2,3,4,5,6,7}'),
  days_ahead int not null default 3 check (days_ahead between 0 and 14),
  cutoff_time time default '21:00',                     -- tutup pendaftaran online hari yang sama; null = tanpa batas
  max_per_whatsapp int not null default 3 check (max_per_whatsapp between 1 and 10),
  max_calls int not null default 2 check (max_calls between 1 and 5),  -- dipanggil sekian kali lalu boleh ditandai tidak hadir
  walk_in_enabled boolean not null default true,
  updated_at timestamptz not null default now(),

  constraint practice_hours_order check (close_time > open_time),
  -- Perkiraan jam pasien terakhir tidak boleh melewati jam tutup (catatan Fase 2, butir 5).
  constraint quota_fits_hours
    check (daily_quota * avg_minutes <= extract(epoch from (close_time - open_time)) / 60),
  constraint cutoff_before_close check (cutoff_time is null or cutoff_time <= close_time)
);

insert into public.practice_settings (id) values (1);

create table public.closed_days (
  day date primary key,
  reason text check (char_length(reason) <= 200)
);

-- Satu counter per tanggal. Barisnya dikunci take_queue selama transaksi.
create table public.daily_counters (
  queue_date date primary key,
  last_number int not null default 0 check (last_number >= 0)
);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  queue_date date not null,
  number int not null check (number >= 1),
  name text not null check (char_length(name) between 2 and 80),
  whatsapp text not null check (whatsapp ~ '^62[0-9]{8,13}$'),  -- sudah dinormalisasi di server
  complaint text check (char_length(complaint) <= 500),
  status public.queue_status not null default 'waiting',
  -- Dua UUID v4 = 244 bit acak, 64 karakter heksadesimal.
  public_token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  source text not null default 'online' check (source in ('online', 'walk_in')),
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  called_at timestamptz,                                -- panggilan terakhir
  finished_at timestamptz,
  call_count smallint not null default 0 check (call_count >= 0),
  unique (queue_date, number)
);

create index queue_entries_date_status_idx on public.queue_entries (queue_date, status);
create index queue_entries_date_whatsapp_idx on public.queue_entries (queue_date, whatsapp);
