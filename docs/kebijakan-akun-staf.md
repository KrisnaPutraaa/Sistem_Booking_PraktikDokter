# Kebijakan akun staf

Berlaku untuk semua akun panel staf (perawat, dokter, pemilik). Dibuat pada Fase 6 (4 November 2026).

## Aturan

1. **Satu akun untuk satu orang.** Akun tidak dipakai bersama, termasuk dokter dan perawat. Audit log mencatat
   siapa mengubah apa, jadi akun bersama membuat catatan itu tidak berguna.
2. **Kata sandi minimal 12 karakter**, tidak dipakai di layanan lain, dan tidak dibagikan lewat chat. Lebih baik
   kalimat panjang yang mudah diingat daripada kata pendek yang rumit. Simpan di pengelola kata sandi.
3. **Verifikasi dua langkah** (kode 6 digit dari aplikasi authenticator):
   - wajib untuk dokter dan pemilik, karena database menolak akses mereka tanpa sesi terverifikasi;
   - opsional untuk perawat, dan bisa diaktifkan dari halaman Akun.
4. **Staf yang berhenti dinonaktifkan pada hari terakhirnya.** Pemilik membuka halaman Akun lalu menekan
   Nonaktifkan. Akses database langsung terputus. Akun tidak langsung dihapus supaya audit log tetap menunjuk ke
   orang yang benar. Hapus permanen lewat dashboard bila sudah tidak diperlukan (lihat di bawah).
5. Keluar (tombol Keluar) setelah memakai komputer bersama di praktik.

## Membuat akun baru (pemilik)

1. Supabase dashboard, Authentication, Users, **Add user**. Isi email orang itu dan kata sandi sementara
   (minimal 12 karakter). Centang *Auto Confirm User*.
2. SQL Editor:
   `insert into profiles (id, full_name, role) values ('<UUID_PENGGUNA>', '<Nama>', 'nurse');`
   Peran: `nurse`, `doctor`, atau `owner`.
3. Serahkan kata sandi sementara secara langsung (bukan lewat chat). Minta orang itu masuk, lalu mengganti kata
   sandi di halaman **Akun**.
4. Dokter dan pemilik langsung diminta memasang verifikasi dua langkah saat pertama kali masuk, lalu menyimpan
   10 kode pemulihan.

## Ponsel hilang atau diganti

- **Masih punya kode pemulihan:** di layar kode verifikasi, pilih "Ponsel hilang? Pakai kode pemulihan". Perangkat
  lama dilepas. Masuk lagi, pasang ponsel baru, lalu simpan kode pemulihan yang baru.
- **Tidak punya kode pemulihan:** pemilik membuka halaman Akun, lalu Akun staf, lalu **Reset dua langkah** pada akun
  itu. Staf masuk lagi dengan kata sandi dan memasang ponsel baru.
- **Ponsel pemilik sendiri hilang dan kode pemulihan juga hilang:** Supabase dashboard, Authentication, Users, pilih
  akun pemilik, hapus faktor MFA-nya (atau SQL: `delete from auth.mfa_factors where user_id = '<UUID>';`).
  Karena itu, akses ke dashboard Supabase (akun GitHub/email pemilik) harus dijaga dengan verifikasi dua langkah juga.

## Setelan Supabase Auth (cek di dev dan produksi)

- [ ] Authentication, Sign In / Providers: *Allow new users to sign up* **mati**.
- [ ] Email: *Confirm email* aktif.
- [ ] Password: *Minimum password length* **12**. *Leaked password protection* aktif bila tersedia di paket.
- [ ] Multi-Factor: **TOTP aktif** (bawaan Supabase).
- [ ] Rate limits: biarkan bawaan. Aplikasi menambah batas sendiri per IP dan per email.
- [ ] Site URL dan Redirect URLs sesuai bagian 3.2 panduan.

## Hapus permanen akun

Hanya setelah akun dinonaktifkan dan tidak diperlukan lagi. Supabase dashboard, Authentication, Users, Delete user.
Profil ikut terhapus. Baris audit log tetap ada dengan `actor` berisi UUID lama, jadi catat UUID dan nama orang
itu di catatan pemilik sebelum menghapus.
