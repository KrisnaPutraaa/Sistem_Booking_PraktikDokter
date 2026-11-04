# Rencana bila terjadi kebocoran data

Dokumen singkat untuk praktik dr. Luh Putu Dhena Purwaningsih, Sp.THT-KL. Dibuat pada Fase 6 (4 November 2026).
**Draf:** kewajiban hukum di bawah ini perlu dikonfirmasi oleh pihak yang memahami UU No. 27 Tahun 2022 tentang
Pelindungan Data Pribadi (UU PDP). Dokumen ini tidak mengklaim praktik sudah patuh.

## Siapa melakukan apa

| Peran | Orang | Tugas |
|---|---|---|
| Penanggung jawab teknis | Pemilik (Krizzz) | Menghentikan kebocoran, memeriksa log, memulihkan sistem |
| Pengambil keputusan | dr. Dhena | Memutuskan pemberitahuan ke pasien dan pihak berwenang |
| Kontak pasien | Perawat | Menjawab pertanyaan pasien dengan naskah yang disetujui dokter |

Catat nomor darurat ketiganya di luar sistem ini (misalnya di pengelola kata sandi bersama).

## Tanda-tanda yang perlu ditanggapi

- Login staf yang tidak dikenal, atau akun staf yang tiba-tiba terkunci.
- Audit log berisi perubahan yang tidak dilakukan staf (pemilik: Supabase, Table Editor, `audit_log`).
- Kunci rahasia (`SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`) terlihat di chat, repo, tangkapan layar,
  atau peringatan GitHub secret scanning.
- Laptop atau ponsel staf yang masih login hilang.
- Pasien melapor menerima pesan aneh yang menyebut data antreannya.

## Langkah dalam 1 jam pertama: hentikan

1. **Jangan panik dan jangan menghapus apa pun.** Log dan audit log diperlukan untuk menilai dampaknya.
2. Catat waktu kejadian, siapa yang menemukan, dan apa yang terlihat (tanpa menyalin data pasien).
3. Bila kunci rahasia bocor: buat kunci baru di Supabase (Project Settings, API Keys) atau Cloudflare
   Turnstile, ganti di Vercel (Production dan Preview), deploy ulang, lalu cabut kunci lama.
4. Bila akun staf diduga dibobol: di halaman Akun, pemilik menonaktifkan akun itu, lalu mereset verifikasi dua
   langkahnya. Ganti kata sandinya di dashboard Supabase (Authentication, Users).
5. Bila sumbernya belum jelas: keluarkan semua sesi (dashboard Supabase, Authentication, Users, sign out user)
   dan pertimbangkan menutup pendaftaran sementara (Pengaturan, hari libur hari ini).

## Dalam 24 jam: nilai dampaknya

- Data apa yang mungkin terbuka: nama, nomor WhatsApp, keluhan (informasi kesehatan), tanggal antrean.
- Berapa pasien dan rentang tanggal berapa. Pakai audit log (actor, waktu, entry_id) dan log Vercel/Supabase.
- Apakah datanya hanya terbaca atau juga diubah/dihapus. Bila diubah, pulihkan dari backup Supabase.
- Simpan ringkasan temuan (tanpa data pasien) di catatan insiden.

## Dalam 3 x 24 jam: beri tahu

Menurut pemahaman kami, UU PDP (Pasal 46) mewajibkan pemberitahuan tertulis paling lambat 3 x 24 jam kepada
pasien yang terdampak dan kepada lembaga yang berwenang. **Perlu dikonfirmasi** oleh pihak yang memahami aturan,
termasuk ke lembaga mana dan dalam bentuk apa.

Isi pemberitahuan minimal:

- data apa yang terungkap;
- kapan dan bagaimana kejadiannya (sejauh diketahui);
- apa yang sudah dilakukan praktik untuk menangani dan memulihkannya;
- apa yang bisa dilakukan pasien (misalnya waspada pesan penipuan yang mengatasnamakan praktik);
- kontak praktik untuk pertanyaan.

Kirim lewat WhatsApp praktik kepada nomor yang terdampak, dengan naskah yang disetujui dokter.

## Setelah selesai

- Tulis penyebab dan perbaikannya di catatan insiden. Bila ada yang perlu diubah di kode, kerjakan lewat pull
  request seperti biasa.
- Tinjau ulang daftar periksa di `docs/tinjauan-keamanan.md`.
- Latih ulang langkah ini setahun sekali (misalnya simulasi kunci bocor di project dev).
