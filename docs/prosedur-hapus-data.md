# Lama penyimpanan dan penghapusan data pasien

Keputusan dokter (Fase 6, 4 November 2026): **data pasien disimpan tanpa batas waktu otomatis dan dihapus bila
diminta.** Naskah di halaman Kebijakan Privasi masih draf sampai ditinjau dokter dan pihak yang memahami UU PDP.

## Apa arti "dihapus" di sistem ini

Antrean dianonimkan, bukan dihapus barisnya:

| Kolom | Setelah dihapus |
|---|---|
| Nama | `Data dihapus` |
| Nomor WhatsApp | kosong |
| Keluhan | kosong |
| Token tautan nomor antrean | diganti acak, jadi tautan lama tidak bisa dibuka |
| Tanggal, nomor, status, jam dipanggil/selesai, tarif | tetap ada, untuk rekap tanpa identitas |

Penghapusan tidak bisa dibatalkan, termasuk oleh pemilik.

## Atas permintaan pasien (hanya pemilik)

1. Pasien menghubungi WhatsApp praktik atau datang langsung, lalu menyebut nama dan nomor WhatsApp yang dipakai
   saat mendaftar.
2. Pastikan yang meminta adalah pasien sendiri, atau orang tua/wali untuk pasien anak. Cara paling sederhana:
   minta pesan dikirim dari nomor WhatsApp yang terdaftar.
3. Pemilik masuk ke panel (dengan verifikasi dua langkah), buka tab **Hapus data pasien**, lalu cari nomor
   WhatsApp-nya.
4. Periksa daftar antrean bersama pasien. Satu nomor bisa dipakai beberapa anggota keluarga, jadi pilih hanya
   antrean yang diminta.
5. Antrean yang masih menunggu atau sedang diperiksa ditolak. Selesaikan atau tandai tidak hadir dulu di panel
   antrean.
6. Tekan Hapus, lalu konfirmasi. Audit log mencatat siapa yang menghapus dan berapa antrean, tanpa nama atau nomor.
7. Kabari pasien bahwa datanya sudah dihapus. Jangan menyimpan salinan permintaan yang berisi data pasien.

Database sendiri hanya mengizinkan pemilik dengan sesi verifikasi dua langkah (`erase_queue_entries`).

## Yang tidak ikut terhapus otomatis

- **Riwayat chat WhatsApp** di ponsel praktik. Hapus manual bila pasien memintanya.
- **File CSV** yang pernah diekspor dari tab Riwayat. CSV tidak memuat WhatsApp dan keluhan, tetapi memuat nama.
  Hapus atau perbarui salinan yang disimpan.
- **Cadangan otomatis Supabase** (paket berbayar: harian, disimpan beberapa hari sesuai paket). Data yang sudah
  dihapus ikut hilang dari cadangan setelah masa simpannya lewat. Cek masa simpan di Supabase, Database, Backups,
  dan sebutkan angkanya di Kebijakan Privasi saat naskah final.

## Anonimkan otomatis (opsional, bawaan mati)

Pengaturan, Kontak dan privasi, **Anonimkan data pasien otomatis setelah (bulan)**:

- kosong = mati (sesuai keputusan dokter saat ini);
- diisi N (1 sampai 120) = setiap malam pukul 03.00 WITA (`pg_cron`, `run_daily_maintenance`), antrean dengan
  tanggal lebih tua dari N bulan dianonimkan dengan cara yang sama. Audit log mencatat jumlahnya
  (`privacy.auto_anonymize`).

Bila pengaturan ini diaktifkan, perbarui bagian "Berapa lama disimpan" di halaman Kebijakan Privasi.

Pemeliharaan malam yang sama juga membuang catatan batas percobaan (IP dan email yang di-hash) yang lebih tua
dari 2 hari.
