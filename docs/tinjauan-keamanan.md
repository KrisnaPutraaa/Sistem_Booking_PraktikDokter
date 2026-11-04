# Tinjauan keamanan dan privasi (daftar periksa bagian 8)

Tinjauan Fase 6, 4 November 2026, di branch `fase-6-keamanan-privasi`, terhadap project Supabase **dev**.
Ulangi tinjauan ini sebelum peluncuran (Fase 7) dan secara berkala (Fase 8).

Keterangan: **Lulus** = diperiksa dan terbukti. **Cek manual** = hanya bisa dipastikan di dashboard, oleh pemilik.

| Butir | Hasil | Bukti |
|---|---|---|
| Pendaftaran publik Supabase mati | Cek manual | Dashboard dev dan produksi: Authentication, Sign In / Providers. Lihat `docs/kebijakan-akun-staf.md` |
| RLS aktif di semua tabel public; anon tanpa akses ke `queue_entries` | Lulus | `tests/db/access.db.test.ts`. Tabel baru Fase 6 ada di schema `private` (tidak diekspos API, RLS aktif, tanpa hak) |
| Kunci rahasia tidak ada di bundle klien | Lulus | `npm run check:bundle` setelah build: 99 file klien, tanpa nama variabel rahasia, awalan `sb_secret_`, kata `service_role`, atau nilai `SUPABASE_SERVICE_ROLE_KEY`. `TURNSTILE_SECRET_KEY` kosong di `.env.local` dev (memakai kunci uji), jadi nilainya belum ikut dicek. CI menjalankan pemeriksaan yang sama |
| `take_queue` dan fungsi publik hanya untuk service_role | Lulus | Uji database. Fungsi baru (`hit_rate_limit`, kode pemulihan, `log_staff_event`, `anonymize_expired`) juga hanya service_role. `erase_queue_entries` untuk authenticated, tetapi memeriksa owner dan aal2 di dalam |
| Semua input divalidasi zod di server | Lulus | Aksi baru: login, kode MFA, kode pemulihan, ganti kata sandi, pencarian dan hapus data, akun staf (uuid), pengaturan baru |
| Perawat tidak bisa mengubah pengaturan atau kolom selain status/waktu | Lulus | Uji database Fase 2, 4, dan 5 tetap lulus |
| `/staf` dan `/antrean/[token]` noindex dan no-store | Lulus | Diperiksa di browser: `X-Robots-Tag: noindex, nofollow` dan `Cache-Control: no-store` di `/staf/*`, termasuk `/staf/mfa`, `/staf/akun`, `/staf/hapus-data` |
| Token antrean 128-bit acak | Lulus | 244 bit (dua UUID v4). Token diganti saat data dianonimkan |
| CSV bebas CSV injection | Lulus | `src/lib/csv.test.ts` (Fase 5) |
| Persetujuan privasi tersimpan (`consent_at`) | Lulus | Kolom wajib (not null). Teks persetujuan kini menautkan ke `/kebijakan-privasi` (draf) |
| Tidak ada nama, WhatsApp, keluhan di log | Lulus | Semua 27 `console.*` di `src` hanya mencatat kode galat atau nama bucket. Log dev server selama uji browser (login, MFA, hapus data) tidak memuat email, nama, atau nomor. `logging.serverFunctions` tetap mati. Catatan: `ekspor CSV gagal` mencatat `error.message` milik kode sendiri (berisi kode galat) |
| Audit log berjalan dan hanya owner yang bisa membaca | Lulus | Uji database. Kejadian baru: `mfa.*`, `account.*`, `privacy.*`, semuanya tanpa data pribadi (diuji) |
| Secret scanning aktif; `.env` tidak ter-commit | Sebagian | `.gitignore` sudah benar dan `git ls-files` hanya memuat `.env.example`. Secret scanning: cek manual di GitHub, Settings, Code security |

## Tambahan Fase 6

| Butir | Hasil | Bukti |
|---|---|---|
| Header keamanan | Lulus | CSP (tanpa nonce; script `'self' 'unsafe-inline'` + Turnstile; `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`), COOP `same-origin`, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy. Turnstile dan QR MFA berjalan di bawah CSP tanpa pelanggaran di konsol |
| Pesan galat tidak membocorkan detail | Lulus | Login, MFA, dan batas percobaan memakai pesan umum (tidak menyebut apakah email terdaftar atau akun nonaktif). Galat database dipetakan ke pesan ramah; selebihnya pesan umum |
| Batas percobaan | Lulus | Ambil nomor: 10 per 15 menit per IP. Login: 20 per IP dan 8 per email per 15 menit (diuji: percobaan ke-9 ditolak). Kode MFA: 8 per 15 menit per akun. Kode pemulihan: 5 per jam. Ganti kata sandi: 5 per 15 menit |
| Verifikasi dua langkah wajib untuk owner dan dokter | Lulus | Ditegakkan di `current_app_role()`: sesi aal1 owner/dokter tidak melihat data apa pun (uji database), dan panel mengalihkan ke `/staf/mfa` (uji browser) |
| Akun nonaktif kehilangan akses seketika | Lulus | Uji database (token lama ditolak) dan uji browser (login ditolak dengan pesan umum) |
| `npm audit` | Sama dengan Fase 2 | Produksi: 0. Dev: 16 moderate di rantai minimatch milik ESLint. Tidak memakai `--force`. Dependabot akan mengusulkan pembaruan |

## Yang belum dicakup

- CSP dengan nonce: menunda `'unsafe-inline'` untuk script memerlukan render dinamis di semua halaman.
- Vercel Firewall: paket Vercel diputuskan di Fase 7. Batas di database sudah berjalan tanpa Firewall.
- Di luar Vercel (misalnya server lokal), header IP bisa dipalsukan. Di Vercel, header itu diisi platform.
