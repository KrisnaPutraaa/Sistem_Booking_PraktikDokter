# Prosedur akun staf lewat dashboard Supabase

Berlaku sejak revisi Fase 6 (4 November 2026). Staf masuk dengan **username**. Aplikasi memetakan username ke
email internal tetap untuk Supabase Auth:

```
username  →  username@staf.praktik-tht.test
```

Domain `.test` dicadangkan dan **tidak bisa menerima email**. Karena itu fitur "lupa kata sandi" lewat email tidak
ada. Semua pembuatan akun dan reset kata sandi dikerjakan pemilik di dashboard Supabase dengan langkah di bawah.

**Pola username:** 3–32 karakter, huruf kecil `a-z`, angka, titik, garis bawah, tanda hubung; diawali dan diakhiri
huruf atau angka. Contoh: `dhena`, `perawat.ayu`, `krisowner`. Huruf besar yang diketik saat login otomatis
dijadikan kecil.

> **Peringatan: akun Supabase pemilik adalah kunci utama seluruh sistem.** Siapa pun yang bisa membuka dashboard
> Supabase (atau akun GitHub/email yang dipakai untuk masuk ke Supabase) bisa mengganti kata sandi akun mana pun,
> termasuk pemilik, dan membaca semua data pasien. Jaga ketat:
> - aktifkan verifikasi dua langkah di akun Supabase **dan** di akun GitHub/email yang dipakai untuk masuk;
> - jangan bagikan akses dashboard ke staf; undang anggota organisasi hanya bila benar-benar perlu, lalu cabut;
> - jangan masuk ke dashboard dari komputer bersama di praktik;
> - periksa Organization, Team secara berkala dan pastikan tidak ada anggota yang tidak dikenal.

Pengerjaan selalu di project yang benar: **praktik-tht-dev** untuk uji, project produksi untuk akun sungguhan.
Nama project tampil di kiri atas dashboard.

## A. Membuat akun staf baru

1. Tentukan username sesuai pola di atas, misalnya `perawat.ayu`.
2. Buat kata sandi sementara minimal 12 karakter (lihat kebijakan kata sandi di `docs/kebijakan-akun-staf.md`).
3. Dashboard Supabase, **Authentication**, **Users**, **Add user**, **Create new user**:
   - Email: `perawat.ayu@staf.praktik-tht.test` (username + `@staf.praktik-tht.test`, semua huruf kecil);
   - Password: kata sandi sementara;
   - centang **Auto Confirm User** (wajib, karena email konfirmasi tidak bisa terkirim).
4. Dashboard, **SQL Editor**, **New query**, ganti tiga nilai di baris `values`, lalu **Run**:

   ```sql
   -- Beri peran staf. role: 'nurse' (perawat), 'doctor' (dokter), atau 'owner' (pemilik).
   insert into public.profiles (id, full_name, role)
   select u.id, v.full_name, v.role::public.app_role
   from (values ('perawat.ayu', 'Ayu', 'nurse')) as v(username, full_name, role)
   join auth.users u on u.email = v.username || '@staf.praktik-tht.test'
   returning id, full_name, role;
   ```

   Hasil harus **satu baris**. Bila kosong, email di langkah 3 tidak cocok dengan username (cek ejaan dan huruf
   kecil).
5. Serahkan username dan kata sandi sementara **secara langsung** (bukan lewat chat). Minta orang itu masuk di
   `/staf/masuk`, lalu segera mengganti kata sandi di halaman **Akun**.

Membuat baris `auth.users` langsung dengan SQL tidak dianjurkan: tabel itu dikelola Supabase Auth dan butuh banyak
kolom lain (identitas, metadata). Pakai **Add user** seperti di atas.

## B. Mengganti kata sandi akun staf mana pun (termasuk pemilik)

Dipakai bila staf lupa kata sandi, atau kata sandi diduga bocor. Staf yang masih ingat kata sandinya cukup memakai
halaman **Akun**, Ganti kata sandi.

1. Siapkan kata sandi baru minimal 12 karakter. **SQL tidak memeriksa kebijakan kata sandi Supabase** (panjang
   minimal dan cek kata sandi bocor), jadi pastikan sendiri. Pakai kata sandi sementara.
2. Dashboard, **SQL Editor**, **New query**. Ganti `USERNAME` dan `KATA-SANDI-BARU`, lalu **Run**:

   ```sql
   -- Ganti kata sandi dan keluarkan semua sesi akun itu.
   with target as (
     select id from auth.users where email = 'USERNAME' || '@staf.praktik-tht.test'
   ), upd as (
     update auth.users u
     set encrypted_password = extensions.crypt('KATA-SANDI-BARU', extensions.gen_salt('bf', 10)),
         updated_at = now()
     from target t
     where u.id = t.id
     returning u.id
   ), sesi as (
     delete from auth.sessions s using upd where s.user_id = upd.id returning s.id
   )
   select (select count(*) from upd) as akun_diubah, (select count(*) from sesi) as sesi_dikeluarkan;
   ```

   `akun_diubah` harus **1**. Bila 0, username salah dan tidak ada yang berubah.
3. Kata sandi kini tercatat di riwayat SQL Editor. Hapus jejaknya: jangan simpan query sebagai snippet, tutup tab
   query tanpa menyimpan, dan hapus query itu dari daftar riwayat/snippet bila muncul.
4. Serahkan kata sandi sementara secara langsung. Minta staf masuk, lalu menggantinya di halaman **Akun**.

Catatan:
- Sesi lain dikeluarkan (token penyegaran dihapus). Token akses yang sudah terbit tetap berlaku sampai kedaluwarsa
  (bawaan Supabase 1 jam). Bila akun diduga dibobol, **nonaktifkan dulu** akunnya (halaman Akun, Nonaktifkan, atau
  `update public.profiles set disabled_at = now() where id = '<UUID>';`): database langsung menolak aksesnya.
- Verifikasi dua langkah tidak ikut direset. Bila staf memasang MFA dan kehilangan ponselnya, lihat bagian "Ponsel
  hilang" di `docs/kebijakan-akun-staf.md`.
- Untuk **akun pemilik sendiri**, langkahnya sama, dikerjakan oleh pemilik di dashboard Supabase.

## C. Memetakan akun dev lama ke username (sekali jalan)

Akun dev yang dibuat sebelum revisi ini masih memakai email asli dan **tidak bisa masuk** dengan username sampai
dipetakan. Kata sandi tidak berubah. Pemetaan yang diputuskan pemilik:

| Peran | Username | Email internal baru |
|---|---|---|
| owner (pemilik) | `krisowner` | `krisowner@staf.praktik-tht.test` |
| doctor (dokter) | `krisdokter` | `krisdokter@staf.praktik-tht.test` |
| nurse (perawat) | `krisperawat` | `krisperawat@staf.praktik-tht.test` |

Jalankan di project **praktik-tht-dev**, SQL Editor.

**Langkah 1: periksa dulu.** Pastikan setiap peran punya tepat satu akun aktif:

```sql
select p.role, p.full_name, p.id, p.disabled_at is not null as nonaktif
from public.profiles p
order by p.role, p.full_name;
```

**Langkah 2: petakan.** Blok ini berhenti tanpa mengubah apa pun bila ada peran dengan nol atau lebih dari satu
akun aktif, atau email tujuan sudah dipakai:

```sql
do $$
declare
  m record;
  v_ids uuid[];
  v_email text;
begin
  for m in
    select * from (values
      ('krisowner',   'owner'::public.app_role),
      ('krisdokter',  'doctor'::public.app_role),
      ('krisperawat', 'nurse'::public.app_role)
    ) as t(username, role)
  loop
    v_email := m.username || '@staf.praktik-tht.test';

    select array_agg(p.id) into v_ids
    from public.profiles p
    where p.role = m.role and p.disabled_at is null;

    if coalesce(cardinality(v_ids), 0) <> 1 then
      raise exception 'Peran % punya % akun aktif; pakai langkah 2b (per UUID).', m.role, coalesce(cardinality(v_ids), 0);
    end if;
    if exists (select 1 from auth.users u where u.email = v_email and u.id <> v_ids[1]) then
      raise exception 'Email % sudah dipakai akun lain.', v_email;
    end if;

    update auth.users
    set email = v_email,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        email_change = '',
        email_change_token_new = '',
        email_change_token_current = '',
        updated_at = now()
    where id = v_ids[1];

    update auth.identities
    set identity_data = identity_data || jsonb_build_object('email', v_email, 'email_verified', true),
        updated_at = now()
    where user_id = v_ids[1] and provider = 'email';

    raise notice '% -> %', m.role, v_email;
  end loop;
end
$$;
```

Karena satu blok `do`, semua berhasil atau tidak ada yang berubah.

**Langkah 2b (hanya bila langkah 2 berhenti karena ada beberapa akun dengan peran sama):** ambil UUID yang benar
dari hasil langkah 1, lalu jalankan per akun:

```sql
do $$
declare
  v_id uuid := '<UUID>';
  v_email text := 'krisdokter@staf.praktik-tht.test';
begin
  update auth.users
  set email = v_email, email_confirmed_at = coalesce(email_confirmed_at, now()),
      email_change = '', email_change_token_new = '', email_change_token_current = '', updated_at = now()
  where id = v_id;
  if not found then raise exception 'UUID tidak ditemukan'; end if;
  update auth.identities
  set identity_data = identity_data || jsonb_build_object('email', v_email, 'email_verified', true), updated_at = now()
  where user_id = v_id and provider = 'email';
end
$$;
```

**Langkah 3: cek hasil.**

```sql
select p.role, p.full_name, u.email
from public.profiles p join auth.users u on u.id = p.id
order by p.role;
```

Lalu masuk di `/staf/masuk` dengan username `krisowner`, `krisdokter`, dan `krisperawat` memakai kata sandi lama.
Di halaman Akun, akun yang belum dipetakan tampil dengan email lama dan tanda "(belum dipetakan)".

Untuk produksi (Fase 7), akun dibuat langsung dengan langkah A, jadi pemetaan ini tidak diperlukan.
