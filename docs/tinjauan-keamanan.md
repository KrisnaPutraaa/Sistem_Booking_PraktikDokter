# Tinjauan keamanan dan privasi (daftar periksa bagian 8)

Tinjauan Fase 6, 4 November 2026, di branch `fase-6-keamanan-privasi`, terhadap project Supabase **dev**.
Ulangi tinjauan ini sebelum peluncuran (Fase 7) dan secara berkala (Fase 8).

**Revisi pemilik (4 November 2026):** verifikasi dua langkah tidak lagi wajib untuk peran mana pun, dan staf masuk
dengan username. Butir yang terdampak ditandai *(revisi)* dan dijelaskan di bagian "Revisi: MFA opsional dan login
username".

Keterangan: **Lulus** = diperiksa dan terbukti. **Cek manual** = hanya bisa dipastikan di dashboard, oleh pemilik.

| Butir | Hasil | Bukti |
|---|---|---|
| Pendaftaran publik Supabase mati | Cek manual | Dashboard dev dan produksi: Authentication, Sign In / Providers. Lihat `docs/kebijakan-akun-staf.md` |
| RLS aktif di semua tabel public; anon tanpa akses ke `queue_entries` | Lulus | `tests/db/access.db.test.ts`. Tabel baru Fase 6 ada di schema `private` (tidak diekspos API, RLS aktif, tanpa hak) |
| Kunci rahasia tidak ada di bundle klien | Lulus | `npm run check:bundle` setelah build: 99 file klien, tanpa nama variabel rahasia, awalan `sb_secret_`, kata `service_role`, atau nilai `SUPABASE_SERVICE_ROLE_KEY`. `TURNSTILE_SECRET_KEY` kosong di `.env.local` dev (memakai kunci uji), jadi nilainya belum ikut dicek. CI menjalankan pemeriksaan yang sama |
| `take_queue` dan fungsi publik hanya untuk service_role | Lulus | Uji database. Fungsi baru (`hit_rate_limit`, kode pemulihan, `log_staff_event`, `anonymize_expired`) juga hanya service_role. `erase_queue_entries` untuk authenticated, tetapi memeriksa owner di dalam (lewat `current_app_role()`, termasuk aal2 bila akun memasang MFA). *(revisi)* `mfa_wajib()` untuk authenticated dan service_role, hanya mengembalikan boolean; anon ditolak (diuji) |
| Semua input divalidasi zod di server | Lulus | Aksi baru: login (username, *revisi*), kode MFA, kode pemulihan, ganti kata sandi, pencarian dan hapus data, akun staf (uuid), pengaturan baru |
| Perawat tidak bisa mengubah pengaturan atau kolom selain status/waktu | Lulus | Uji database Fase 2, 4, dan 5 tetap lulus |
| `/staf` dan `/antrean/[token]` noindex dan no-store | Lulus | Diperiksa di browser: `X-Robots-Tag: noindex, nofollow` dan `Cache-Control: no-store` di `/staf/*`, termasuk `/staf/mfa`, `/staf/akun`, `/staf/hapus-data` |
| Token antrean 128-bit acak | Lulus | 244 bit (dua UUID v4). Token diganti saat data dianonimkan |
| CSV bebas CSV injection | Lulus | `src/lib/csv.test.ts` (Fase 5) |
| Persetujuan privasi tersimpan (`consent_at`) | Lulus | Kolom wajib (not null). Teks persetujuan kini menautkan ke `/kebijakan-privasi` (draf) |
| Tidak ada nama, WhatsApp, keluhan di log | Lulus | Semua 27 `console.*` di `src` hanya mencatat kode galat atau nama bucket. Log dev server selama uji browser (login, MFA, hapus data) tidak memuat email, nama, atau nomor. *(revisi)* Login username juga tidak mencatat username. `logging.serverFunctions` tetap mati. Catatan: `ekspor CSV gagal` mencatat `error.message` milik kode sendiri (berisi kode galat) |
| Audit log berjalan dan hanya owner yang bisa membaca | Lulus | Uji database. Kejadian baru: `mfa.*`, `account.*`, `privacy.*`, semuanya tanpa data pribadi (diuji) |
| Secret scanning aktif; `.env` tidak ter-commit | Sebagian | `.gitignore` sudah benar dan `git ls-files` hanya memuat `.env.example`. Secret scanning: cek manual di GitHub, Settings, Code security |

## Tambahan Fase 6

| Butir | Hasil | Bukti |
|---|---|---|
| Header keamanan | Lulus | CSP (tanpa nonce; script `'self' 'unsafe-inline'` + Turnstile; `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`), COOP `same-origin`, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy. Turnstile dan QR MFA berjalan di bawah CSP tanpa pelanggaran di konsol |
| Pesan galat tidak membocorkan detail | Lulus | Login, MFA, dan batas percobaan memakai pesan umum (tidak menyebut apakah username terdaftar atau akun nonaktif; *revisi*: "Username atau kata sandi salah", diuji di browser). Galat database dipetakan ke pesan ramah; selebihnya pesan umum |
| Batas percobaan | Lulus | Ambil nomor: 10 per 15 menit per IP. Login: 20 per IP dan 8 per username per 15 menit (*revisi*: bucket `login_username`, diuji di browser: percobaan ke-9 untuk username yang sama ditolak; log dev server tidak memuat username). Kode MFA: 8 per 15 menit per akun. Kode pemulihan: 5 per jam. Ganti kata sandi: 5 per 15 menit |
| Verifikasi dua langkah | Opsional *(revisi)* | Tidak wajib untuk peran mana pun (migrasi `20261107000001_mfa_opsional.sql`). Owner/dokter aal1 tanpa faktor mendapat akses (uji database). Akun yang memasang faktor tetap wajib aal2 di `current_app_role()` (uji database, semua peran). Saklar `private.security_settings.mfa_wajib` (bawaan mati, hanya lewat SQL Editor) mengembalikan kewajiban untuk owner dan dokter; jalur ini **belum diuji otomatis** karena saklar sengaja tidak bisa diubah lewat API |
| Akun nonaktif kehilangan akses seketika | Lulus | Uji database (token lama ditolak) dan uji browser (login ditolak dengan pesan umum) |
| `npm audit` | Sama dengan Fase 2 | Produksi: 0. Dev: 16 moderate di rantai minimatch milik ESLint. Tidak memakai `--force`. Dependabot akan mengusulkan pembaruan |

## Revisi: MFA opsional dan login username

| Butir | Hasil | Bukti |
|---|---|---|
| Login hanya dengan username di `/staf/masuk` | Lulus | Username divalidasi zod (pola `^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$`, dinormalisasi huruf kecil), dipetakan ke `username@staf.praktik-tht.test`. Unit test `src/lib/staff/username.test.ts` dan `schemas.test.ts` |
| `/dokter/masuk` dan `/owner/masuk` | Lulus | Hanya pengalihan 307 ke `/staf/masuk` (`next.config.ts`), diperiksa dengan curl dan browser |
| Kebijakan kata sandi | Lulus | Minimal 12 karakter di form ganti kata sandi; kebijakan tertulis di `docs/kebijakan-akun-staf.md`. Setelan *Minimum password length* Supabase: cek manual |
| Reset kata sandi tanpa email | Prosedur | Tidak ada fitur di aplikasi. Prosedur SQL Editor di `docs/prosedur-akun-staf-supabase.md`. SQL di dokumen itu **belum dijalankan** (dijalankan pemilik) |
| Akun Supabase pemilik | Cek manual | Kini satu-satunya jalur pemulihan akun. Wajib verifikasi dua langkah di Supabase dan akun GitHub/email yang dipakai masuk |

Dampak keamanan ringkas: tanpa MFA wajib, kata sandi menjadi satu-satunya faktor. Risiko ini ditekan dengan
kebijakan kata sandi kuat, batas percobaan per IP dan per username, pesan galat umum, penonaktifan akun seketika,
dan MFA sukarela. Batas per username memungkinkan penguncian sementara (15 menit) oleh pihak lain; ini dianggap
dapat diterima untuk praktik kecil.

## Yang belum dicakup

- CSP dengan nonce: menunda `'unsafe-inline'` untuk script memerlukan render dinamis di semua halaman.
- Vercel Firewall: paket Vercel diputuskan di Fase 7. Batas di database sudah berjalan tanpa Firewall.
- Di luar Vercel (misalnya server lokal), header IP bisa dipalsukan. Di Vercel, header itu diisi platform.
