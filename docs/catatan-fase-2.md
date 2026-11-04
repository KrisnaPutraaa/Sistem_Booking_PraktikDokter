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
