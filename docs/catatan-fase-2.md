# Catatan untuk fase berikutnya

Temuan saat Fase 1. Dicatat saja, belum diperbaiki (keputusan pemilik proyek).

## Fase 2 (database)

1. **`cutoff_time` bawaannya null**, sedangkan bagian 9 menyebut batas pendaftaran hari yang sama 21.00.
   Perlu dipilih: default `'21:00'` di migrasi, atau tetap null sampai diisi lewat Pengaturan.
2. **Aturan "dilewati setelah dipanggil 2 kali, bisa disisipkan kembali"** (bagian 9) belum punya kolom.
   Kemungkinan butuh `call_count int` di `queue_entries` dan aturan urutan panggil.
3. **Sakelar walk-in** (bagian 9: "Aktif") belum punya kolom di `practice_settings`.
4. **`take_queue` memakai `#variable_conflict use_column`** sementara kolom keluaran `RETURNS TABLE`
   bernama `number` dan `queue_date`, sama dengan nama kolom tabel. Perlu diuji teliti (insert,
   `on conflict`, `returning`), atau ganti nama kolom keluaran (mis. `out_number`).
5. **Perkiraan jam tidak dibatasi `close_time`.** Hanya validasi pengaturan (kuota × durasi muat dalam
   jam praktik) yang mencegah perkiraan melewati jam tutup. Validasi ini wajib ada (trigger atau
   check di fungsi simpan pengaturan).
6. **Audit log:** `actor` diisi `auth.uid()` oleh trigger. Saat aksi lewat service_role (walk-in),
   `auth.uid()` null, jadi Server Action perlu meneruskan id staf (mis. parameter tambahan atau
   `set_config`).
7. **Normalisasi WhatsApp** dilakukan di server (Fase 3). Constraint database `^62[0-9]{8,13}$`
   menjadi pengaman terakhir.

## Fase 3 ke atas

- **Next 16 + `cacheComponents: true`** (bawaan create-next-app): data dinamis secara bawaan.
  `export const dynamic = "force-dynamic"` dari dokumen panduan **tidak dipakai** lagi. Halaman
  antrean cukup tidak memakai `"use cache"`. Header `no-store` untuk `/antrean/*` dan `/staf/*`
  sudah dipasang di `next.config.ts`.
- **`proxy.ts` menggantikan `middleware.ts`** (Next 16). Dipakai di Fase 4 untuk sesi staf.
- **noindex**: header `X-Robots-Tag` sudah dipasang. Tambahkan juga `robots: { index: false }`
  di metadata layout `/staf` dan `/antrean` saat halaman dibuat.
- **CSP** ditunda ke Fase 6: harus mengizinkan `challenges.cloudflare.com` (Turnstile).
- **`npm audit`**: 16 kerentanan moderate, semuanya di rantai dependensi ESLint (minimatch lewat
  eslint-plugin-*), hanya dev. Tidak memakai `npm audit fix --force` karena memaksa versi mayor.
  Tinjau lagi di Fase 6/8.
- **Node**: `engines` diset `>=22.12.0` karena Vitest 5 tidak mendukung Node 20. Samakan setelan
  Node di Vercel (22 atau 24).

## Dari Fase 4 untuk Fase 5

- **Pengaturan** perlu menyunting `registration_open_time` (jam buka pendaftaran, bawaan 00:00)
  bersama `cutoff_time` (jam tutup). Constraint: jam buka < jam tutup <= `close_time`.
- **`emergency_notice`** sekarang pengumuman opsional (bawaan kosong). Isian kosong disimpan sebagai null.
- **Tarif (`fee_rupiah`)**: putuskan apakah ikut ekspor CSV dan rekap. Perubahan tarif harus berdiri
  sendiri (tidak bersamaan dengan perubahan status), dijaga trigger `queue_entries_status_guard`.
- Kartu Pengaturan di panel masih hanya-baca. Tab Riwayat dan rekap serta tombol Ekspor CSV belum ada.

## Dari Fase 5 untuk Fase 6 ke atas

- **Migrasi `20261105000001_fase5.sql`** sudah di-push ke `praktik-tht-dev` saja. Project produksi
  (Fase 7) perlu `supabase db push` sendiri.
- **Hak kolom `name`** sekarang diberikan ke `authenticated`; pembatasan ke dokter dan owner dijaga
  trigger `queue_entries_status_guard` (`NAME_NOT_ALLOWED`). Perawat ditolak dengan kode P0001,
  bukan 42501 lagi (uji access/fase4 disesuaikan).
- **Audit koreksi nama**: `new_data.name_changed = true`, tanpa nama lama atau baru.
- **`done -> in_progress`** hanya dokter dan owner (`REVERT_NOT_ALLOWED`); `finished_at` dikosongkan,
  `called_at` dan `call_count` tetap. Server Action membatasi status asal per aksi
  (`STATUS_ACTION_FROM`), jadi "Panggil" pada pasien selesai tidak ikut membuka ulang.
- **CSV**: per pasien, tanpa WhatsApp dan keluhan, BOM UTF-8, pemisah `;`, CRLF, rumus dinetralkan
  dengan `'`. Sudah diuji di browser (byte BOM, header, escape), **belum dibuka di Excel sungguhan**.
- **Rekap**: rata-rata durasi = `finished_at - called_at` (panggilan terakhir), ditimbang per pasien.
  `get_daily_recap` membatasi 92 hari dan mengembalikan `out_total_fee = null` untuk perawat.
- **Belum ada di halaman Pengaturan** (di luar daftar Fase 5): `max_calls`, nama klinik, alamat,
  nomor WhatsApp praktik, dan teks profil (bagian 9: "diisi dari halaman Pengaturan").
- **Hari libur** pada tanggal yang sudah punya antrean aktif diizinkan dengan peringatan; antrean
  yang ada tidak dibatalkan otomatis. Perlu keputusan bila ingin pembatalan dan pesan WhatsApp massal.
- Filter "Semua status" dari desain Riwayat dipasang di kartu detail pasien per tanggal (filter ini
  tidak bermakna untuk tabel rekap per hari).

## Dari Fase 6 untuk Fase 7 ke atas

- **Migrasi `20261106000001_fase6.sql`** sudah di-push ke `praktik-tht-dev` saja. Produksi perlu `supabase db push`
  sendiri. Migrasi ini memasang `pgcrypto` (schema `extensions`) dan `pg_cron`, membuat schema `private`, serta
  menjadwalkan `praktik-pemeliharaan-harian` (03.00 WITA).
- **Revisi pemilik (4 November 2026):** verifikasi dua langkah tidak wajib; login dengan username. Migrasi
  `20261107000001_mfa_opsional.sql` sudah di-push ke `praktik-tht-dev` saja; produksi perlu `supabase db push`.
- **Akun dev lama** harus dipetakan ke username `krisowner`, `krisdokter`, `krisperawat` dengan SQL di
  `docs/prosedur-akun-staf-supabase.md` bagian C (dijalankan pemilik, belum dijalankan). Sebelum itu akun tersebut
  tidak bisa masuk.
- **Produksi:** buat akun staf langsung dengan username (prosedur bagian A). Tidak ada reset kata sandi lewat email.
- **Teks privasi masih DRAF**: `src/app/kebijakan-privasi/page.tsx` (ada kotak "Draf" yang tampil ke pasien) dan
  teks centang di `src/app/ambil/take-queue-form.tsx`. Hal yang perlu ditinjau dokter dan pihak yang paham UU PDP:
  dasar pemrosesan dan bentuk persetujuan untuk data kesehatan (keluhan); transfer data ke luar negeri (Supabase
  Singapura, Vercel); masa simpan cadangan Supabase (isi angka pastinya); kanal permintaan hapus; kewajiban
  notifikasi kebocoran di `docs/rencana-insiden-kebocoran-data.md`. Setelah disetujui: ubah `DRAFT_UPDATED`, hapus
  kotak Draf dan komentar DRAF.
- **Nomor WhatsApp praktik** belum diisi. Isi di Pengaturan, Kontak dan privasi, supaya tampil di Kebijakan Privasi.
- **Setelan Supabase Auth** (dev dan produksi): kata sandi minimal 12, TOTP aktif (untuk MFA sukarela), pendaftaran publik mati, leaked
  password protection bila tersedia. Daftar periksa di `docs/kebijakan-akun-staf.md`.
- **GitHub**: aktifkan secret scanning. Setelah merge, Dependabot dan workflow CI berjalan. Pertimbangkan menjadikan
  CI sebagai *required check* di branch protection `main`.
- **Vercel Firewall**: opsional. Bila paket mendukung, tambahkan aturan rate limit untuk POST `/ambil` dan
  `/staf/masuk` sebagai lapisan di depan batas database.
- **Next 16 menyimpan state halaman** yang pernah dibuka (juga setelah keluar dan masuk). Data yang hanya boleh tampil
  sekali (kode pemulihan) atau data pasien hasil pencarian dibuang dengan `useClearOnHide`. Pakai pola yang sama
  untuk layar sensitif baru.
- Batas percobaan dan pengaturan anonimkan otomatis: lihat `src/lib/rate-limit.ts` dan `docs/prosedur-hapus-data.md`.
