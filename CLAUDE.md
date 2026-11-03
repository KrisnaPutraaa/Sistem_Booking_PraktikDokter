# Praktik THT-KL: website antrean pasien

## Konteks
Website antrean untuk praktik dr. Luh Putu Dhena Purwaningsih, Sp.THT-KL (Tabanan, Bali).
Pasien mengambil nomor antrean per hari. Staf (perawat, dokter, owner) mengelola antrean.
Dokumen lengkap: docs/Panduan_Pengerjaan_Website_Antrean_THT.pdf (stack, skema, fase).

## Stack
Next.js (App Router) + TypeScript strict + Tailwind, Supabase (Postgres, Auth, RLS), Vercel.
Package manager: npm. Docker tidak dipakai; database dev = project Supabase cloud.

## Aturan keras
- Zona waktu aplikasi: Asia/Makassar. Jangan hitung tanggal antrean dengan UTC.
- Pasien TIDAK memakai klien Supabase di browser. Semua aksi pasien lewat Server Action
  yang memanggil fungsi database dengan service_role setelah Turnstile terverifikasi.
- SUPABASE_SERVICE_ROLE_KEY dan TURNSTILE_SECRET_KEY hanya di server. Tidak pernah NEXT_PUBLIC.
- RLS aktif di semua tabel. Perubahan skema hanya lewat file di supabase/migrations/.
- Validasi semua input dengan zod di server.
- Jangan log nama, WhatsApp, atau keluhan pasien.
- Halaman /staf/* dan /antrean/[token]: noindex dan Cache-Control no-store.
- Nilai seperti kuota, durasi, jam adalah pengaturan di tabel practice_settings, bukan konstanta kode.
- UI berbahasa Indonesia, mengikuti desain Figma (file key hAIY1CmFxpl8xRhQFONqWv).

## Perintah
npm run dev | npm run build | npm run lint | npm run typecheck | npm test

## Cara kerja
- Kerjakan satu fase per sesi sesuai dokumen. Berhenti dan laporkan di akhir fase.
- Commit kecil dengan pesan jelas. Jangan push langsung ke main; pakai pull request.
- Jangan menambah dependensi besar tanpa alasan. Jelaskan alasannya.
