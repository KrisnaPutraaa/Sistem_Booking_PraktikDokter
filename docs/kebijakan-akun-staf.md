# Kebijakan akun staf

Berlaku untuk semua akun panel staf (perawat, dokter, pemilik). Dibuat pada Fase 6 (4 November 2026), direvisi
pada hari yang sama atas keputusan pemilik: **login dengan username**, **verifikasi dua langkah tidak wajib**.

Semua staf masuk di satu halaman, `/staf/masuk` (`/dokter/masuk` dan `/owner/masuk` hanya mengalihkan ke sana).
Pembuatan akun dan reset kata sandi: `docs/prosedur-akun-staf-supabase.md`.

## Aturan

1. **Satu akun untuk satu orang.** Akun tidak dipakai bersama, termasuk dokter dan perawat. Audit log mencatat
   siapa mengubah apa, jadi akun bersama membuat catatan itu tidak berguna.
2. **Kata sandi kuat** sesuai kebijakan di bawah. Karena verifikasi dua langkah tidak wajib, kata sandi adalah
   pelindung utama data pasien.
3. **Verifikasi dua langkah** (kode 6 digit dari aplikasi authenticator) **opsional untuk semua peran**, bisa
   diaktifkan sendiri dari halaman Akun. Sekali dipasang, akun itu selalu diminta kode saat masuk (ditegakkan
   database) sampai dimatikan lagi. Pemilik dan dokter tetap **dianjurkan** memasangnya.
4. **Staf yang berhenti dinonaktifkan pada hari terakhirnya.** Pemilik membuka halaman Akun lalu menekan
   Nonaktifkan. Akses database langsung terputus. Akun tidak langsung dihapus supaya audit log tetap menunjuk ke
   orang yang benar. Hapus permanen lewat dashboard bila sudah tidak diperlukan (lihat di bawah).
5. Keluar (tombol Keluar) setelah memakai komputer bersama di praktik.

## Kebijakan kata sandi

- **Minimal 12 karakter**, maksimal 72. Halaman Akun menolak kata sandi baru yang lebih pendek; setelan Supabase
  Auth di bawah harus sama (12).
- Lebih baik **kalimat panjang** yang mudah diingat (misalnya empat sampai lima kata acak dengan spasi atau tanda
  hubung) daripada kata pendek yang rumit. Contoh pola, jangan dipakai persis: `meja-hujan-kopi-tabanan-7`.
- **Unik**: tidak dipakai di layanan lain (email, media sosial, bank), tidak memuat nama praktik, nama staf,
  tanggal lahir, nomor HP, atau username.
- **Tidak dibagikan** lewat chat, email, atau kertas tempel. Simpan di pengelola kata sandi (misalnya Bitwarden,
  1Password, atau pengelola bawaan ponsel).
- **Kata sandi sementara** dari pemilik segera diganti di halaman Akun setelah masuk pertama kali atau setelah reset.
- **Ganti segera** bila diduga bocor, perangkat hilang, atau pernah diketik di komputer orang lain. Tidak perlu
  diganti berkala tanpa alasan.
- Kata sandi yang diset lewat SQL Editor (prosedur reset) **tidak diperiksa** Supabase, jadi pemilik wajib
  memastikan aturan ini sendiri.

## Login dengan username: dampak keamanan

- **Tanpa verifikasi dua langkah wajib**, siapa pun yang tahu username dan kata sandi bisa membuka data pasien
  sesuai peran akun itu. Risiko terbesar: kata sandi lemah, dipakai ulang, atau dicatat/dibagikan. Kebijakan kata
  sandi di atas, batas percobaan, dan *leaked password protection* menjadi pertahanan utama.
- **Username lebih mudah ditebak** daripada email. Pesan galat tetap umum ("Username atau kata sandi salah") dan
  batas percobaan berlaku per IP (20 per 15 menit) dan per username (8 per 15 menit), jadi menebak kata sandi kuat
  tetap tidak praktis. Batas per username juga berarti orang lain bisa membuat akun terkunci sementara (15 menit)
  dengan sengaja salah memasukkan kata sandi.
- **Tidak ada reset lewat email** (email internal `.test` tidak bisa menerima email). Pemulihan bergantung pada
  pemilik lewat dashboard Supabase, sehingga **akun Supabase pemilik menjadi titik paling kritis**.
- Saklar `mfa_wajib` (bawaan mati) bisa dinyalakan kelak bila keputusan berubah:
  `update private.security_settings set mfa_wajib = true, updated_at = now() where id = 1;` di SQL Editor. Dokter
  dan pemilik lalu wajib memasang verifikasi dua langkah saat masuk berikutnya (database menolak akses tanpa itu).
  Kembalikan ke `false` untuk mematikan.

## Membuat akun baru (pemilik)

Lihat `docs/prosedur-akun-staf-supabase.md`, bagian A. Ringkasnya: Add user dengan email
`username@staf.praktik-tht.test` (Auto Confirm), beri peran lewat SQL, serahkan kata sandi sementara langsung.

## Lupa kata sandi

Tidak ada fitur atur ulang di aplikasi. Pemilik mengganti kata sandinya lewat SQL Editor:
`docs/prosedur-akun-staf-supabase.md`, bagian B (berlaku juga untuk akun pemilik sendiri).

## Ponsel hilang atau diganti (hanya bila MFA dipasang)

- **Masih punya kode pemulihan:** di layar kode verifikasi, pilih "Ponsel hilang? Pakai kode pemulihan". Perangkat
  lama dilepas. Masuk lagi, pasang ponsel baru, lalu simpan kode pemulihan yang baru.
- **Tidak punya kode pemulihan:** pemilik membuka halaman Akun, lalu Akun staf, lalu **Reset dua langkah** pada akun
  itu. Staf masuk lagi dengan kata sandi dan memasang ponsel baru.
- **Ponsel pemilik sendiri hilang dan kode pemulihan juga hilang:** Supabase dashboard, Authentication, Users, pilih
  akun pemilik, hapus faktor MFA-nya (atau SQL: `delete from auth.mfa_factors where user_id = '<UUID>';`).
  Karena itu, akses ke dashboard Supabase (akun GitHub/email pemilik) harus dijaga dengan verifikasi dua langkah,
  walaupun verifikasi dua langkah di aplikasi tidak wajib.

## Setelan Supabase Auth (cek di dev dan produksi)

- [ ] Authentication, Sign In / Providers: *Allow new users to sign up* **mati**.
- [ ] Email: *Confirm email* boleh tetap aktif; akun staf dibuat dengan *Auto Confirm User*.
- [ ] Password: *Minimum password length* **12**. *Leaked password protection* aktif bila tersedia di paket.
- [ ] Multi-Factor: **TOTP aktif** (bawaan Supabase), supaya staf tetap bisa memasang MFA secara sukarela.
- [ ] Rate limits: biarkan bawaan. Aplikasi menambah batas sendiri per IP dan per username.
- [ ] Site URL dan Redirect URLs sesuai bagian 3.2 panduan.

## Hapus permanen akun

Hanya setelah akun dinonaktifkan dan tidak diperlukan lagi. Supabase dashboard, Authentication, Users, Delete user.
Profil ikut terhapus. Baris audit log tetap ada dengan `actor` berisi UUID lama, jadi catat UUID dan nama orang
itu di catatan pemilik sebelum menghapus.
