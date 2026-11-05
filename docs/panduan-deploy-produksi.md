# Panduan deploy produksi (Fase 7)

Daftar periksa berurutan untuk pemilik proyek. Disusun 5 November 2026 dari panduan PDF (bagian 3 dan Fase 7),
`docs/catatan-fase-2.md`, `docs/kebijakan-akun-staf.md`, `docs/prosedur-akun-staf-supabase.md`,
`docs/tinjauan-keamanan.md`, dan kode di `main` (Fase 1 sampai 6).

Rencana biaya:

- **Bagian A, uji coba gratis (1 sampai 2 minggu):** Supabase Free + Vercel Hobby, alamat `nama.vercel.app`.
- **Bagian B, peluncuran berbayar (setelah dr. Dhena setuju):** Supabase Pro + Vercel Pro (atau Hostinger, lihat
  bagian D), domain milik praktik.

Cara memakai: kerjakan dari atas ke bawah, centang `[x]` setiap langkah. Jangan lompat ke bagian berikutnya sebelum
pemeriksaan di akhir bagian lulus. Semua kunci dan kata sandi disimpan di pengelola kata sandi, **bukan** di chat,
email, catatan ponsel, atau file di repo.

> Harga dan ketentuan di bawah dicek 5 November 2026 dan bisa berubah. Cek ulang halaman harga Supabase dan Vercel
> sebelum membayar.

---

## 0. Yang perlu diputuskan lebih dulu

Isi kolom "Keputusan" sebelum mulai. Butir bertanda **(wajib)** menghalangi langkah berikutnya.

| No | Hal | Pilihan dan saran | Keputusan |
|---|---|---|---|
| 1 | **Organisasi Supabase untuk produksi** (wajib) | Paket Supabase ditagih **per organisasi**. Saran: buat organisasi baru khusus produksi (misalnya `Praktik THT Produksi`), terpisah dari organisasi tempat `praktik-tht-dev`. Saat upgrade ke Pro, hanya produksi yang berbayar dan dev tetap gratis. Batas paket gratis: 2 project aktif, jadi dev + produksi pas. | |
| 2 | **Nama project Vercel** (wajib) | Nama ini menjadi alamat uji coba `NAMA.vercel.app` yang dilihat pasien. Saran: netral dan mudah diketik, misalnya `antrean-dr-dhena`. Jangan cetak kode QR dengan alamat ini (lihat butir 8). | |
| 3 | **Daftar akun staf asli** (wajib) | Siapa saja, peran apa, username apa. Contoh: pemilik `krizzz` (owner), `dhena` (doctor), `perawat.ayu` (nurse). Satu akun satu orang. | |
| 4 | **Teks privasi masih DRAF** (wajib sebelum pasien sungguhan) | Halaman `/kebijakan-privasi` masih menampilkan kotak "Draf" ke pasien. Pilihan: (a) uji coba hanya dengan staf dan pasien walk-in yang diinput perawat, sambil teks ditinjau; (b) dr. Dhena menyetujui teks dulu, lalu kotak Draf dihapus lewat pull request (perubahan kode kecil, di luar dokumen ini). Saran: (a) di minggu pertama, (b) sebelum pasien mengambil nomor sendiri. | |
| 5 | **Cakupan uji coba** | Siapa yang ikut, mulai tanggal berapa, dan apakah pasien diberi tahu bahwa ini uji coba. Saran: selalu siapkan antrean kertas sebagai cadangan. | |
| 6 | **Nilai Pengaturan praktik** | Kuota harian, rata-rata durasi, jam buka dan tutup, hari buka, batas pendaftaran hari yang sama, nomor WhatsApp praktik, alamat. Bawaan: 20 pasien, 15 menit, 17.30 sampai 23.00, Senin sampai Sabtu. Diisi dr. Dhena atau pemilik di halaman Pengaturan setelah deploy. | |
| 7 | **Hosting berbayar** | Vercel Pro (paling sedikit perubahan) atau Hostinger (perlu perubahan kode, lihat bagian D). Boleh diputuskan di akhir uji coba. | |
| 8 | **Nama domain untuk peluncuran** | Misalnya `antreandrdhena.com`. Daftarkan atas nama praktik atau dr. Dhena, dengan email yang dikuasai praktik dan verifikasi dua langkah. Poster dan kode QR dicetak **setelah** domain ini aktif. | |
| 9 | **Pemegang akun dan kartu pembayaran** | Akun Supabase, Vercel, Cloudflare, GitHub, registrar domain: atas nama siapa, email apa, kartu siapa. Semuanya wajib verifikasi dua langkah. | |
| 10 | **Kapan upgrade ke paket berbayar** | Saran: paling lambat sebelum pengumuman ke pasien umum (poster), atau segera bila ada data pasien sungguhan yang tidak boleh hilang (paket gratis tanpa cadangan). | |

---

## A. Uji coba gratis (Supabase Free + Vercel Hobby)

### Risiko yang diterima selama uji coba

- **Tidak ada cadangan otomatis di Supabase Free.** Bila data rusak atau terhapus, tidak bisa dipulihkan. Tekan
  risikonya: data pasien seminimal mungkin, dokter mengekspor CSV di tab Riwayat setiap malam (CSV tanpa WhatsApp dan
  keluhan, tetapi berisi nama, jadi simpan di tempat aman), dan upgrade ke Pro segera setelah uji coba disetujui.
- **Project dijeda setelah 1 minggu sepi.** Selama praktik buka Senin sampai Sabtu, project tetap aktif. Bila praktik
  libur lebih dari 5 hari, masuk ke panel staf sekali, atau cek dashboard Supabase. Bila terlanjur dijeda: dashboard
  Supabase, pilih project, **Restore project** (butuh beberapa menit, website mati selama itu). Jangan andalkan
  jadwal `pg_cron` harian untuk mencegah jeda.
- **Vercel Hobby hanya untuk penggunaan nonkomersial.** Praktik dokter termasuk komersial. Uji coba dibuat singkat dan
  terbatas, lalu pindah ke Pro (atau Hostinger) sebelum diumumkan. Hobby juga hanya menyimpan log 1 jam, jadi galat
  harus dicek pada hari yang sama.
- **Leaked password protection** kemungkinan hanya tersedia di paket berbayar. Selama uji coba, kebijakan kata sandi
  12 karakter dan batas percobaan menjadi pengaman utama.

### A1. Persiapan akun

- [ ] Akun Supabase, Vercel, Cloudflare, dan GitHub memakai **verifikasi dua langkah**. Akun Supabase adalah kunci
  utama seluruh sistem (lihat peringatan di `docs/prosedur-akun-staf-supabase.md`).
- [ ] GitHub, repo, **Settings, Code security**: *Secret scanning* aktif (dan *Push protection* bila tersedia).
- [ ] GitHub, **Settings, Branches**: aturan untuk `main`: wajib lewat pull request; jadikan pemeriksaan **CI**
  sebagai *required status check*.
- [ ] Pengelola kata sandi punya satu folder "Praktik THT Produksi" untuk semua kunci di bawah.

### A2. Project Supabase produksi

- [ ] Buat organisasi sesuai keputusan no. 1, paket **Free**.
- [ ] **New project**:
  - Nama: `praktik-tht-produksi` (beda jelas dari `praktik-tht-dev`).
  - Region: **Southeast Asia (Singapore)**.
  - Database password: buat yang panjang dan acak, simpan langsung di pengelola kata sandi. Dipakai saat migrasi.
- [ ] Catat **Project ref** (Project Settings, General; 20 huruf kecil, juga bagian depan URL
  `https://<ref>.supabase.co`) di pengelola kata sandi dengan label "REF PRODUKSI". Ref bukan rahasia, tetapi
  jangan sampai tertukar dengan ref dev.

### A3. Pengaturan Auth produksi

Dashboard project produksi (cek nama project di kiri atas), **Authentication**:

- [ ] **Sign In / Providers**: *Allow new users to sign up* **mati**. Hanya *Email* yang aktif; provider lain mati.
- [ ] *Confirm email* boleh tetap aktif (akun staf dibuat dengan *Auto Confirm User*).
- [ ] **Password**: *Minimum password length* **12**. *Leaked password protection*: aktifkan bila tersedia (kalau
  tidak tersedia di Free, catat untuk dinyalakan di B2).
- [ ] **Multi-Factor**: **TOTP** aktif (untuk verifikasi dua langkah sukarela).
- [ ] **Rate limits**: biarkan bawaan.
- [ ] **URL Configuration** diisi nanti di langkah A8, setelah alamat Vercel diketahui.

### A4. Menjalankan migrasi ke produksi (tanpa menyentuh dev)

Repo ini ter-link ke project **dev** (`supabase/.temp`, untuk `npm run test:db`). Langkah di bawah **tidak mengubah
link itu**: setiap perintah menyebut ref produksi secara eksplisit dengan `--remote=<REF_PRODUKSI>`. Perintah ini
memakai sintaks Supabase CLI versi 3 (yang terpasang di komputer ini). Pastikan dulu:

```bash
npx supabase --version
```

Harus `3.x`. Bila versi 2, berhenti dan tanyakan dulu: sintaksnya berbeda (`--linked` / `--db-url`).

Kerjakan di terminal, di folder repo, pada branch `main` yang sudah ter-update (semua fase sudah di-merge):

- [ ] Masuk ke Supabase CLI bila belum (membuka browser):

  ```bash
  npx supabase login
  ```

- [ ] **Latihan kering** (tidak mengubah apa pun). Ganti `REF_PRODUKSI` dengan ref dari A2:

  ```bash
  npx supabase db push --remote=REF_PRODUKSI --dry-run
  ```

  Bila diminta kata sandi database, ketik kata sandi **produksi** saat diminta (jangan tulis di perintah dengan `-p`,
  supaya tidak tersimpan di riwayat terminal). Hasil yang benar: **9 migrasi** akan dijalankan, dari
  `20261103000001_schema.sql` sampai `20261107000001_mfa_opsional.sql`. Bila jumlahnya 0, kemungkinan ref yang dipakai
  adalah dev: **berhenti**.
- [ ] Jalankan sungguhan:

  ```bash
  npx supabase db push --remote=REF_PRODUKSI
  ```

  Jawab konfirmasi dengan `y`. Bila ada galat, salin pesannya (tidak berisi data pasien) dan berhenti; jangan
  mengulang dengan `--include-all` tanpa bertanya.
- [ ] Periksa riwayat migrasi produksi:

  ```bash
  npx supabase migration list --remote=REF_PRODUKSI
  ```

  Kolom *Local* dan *Remote* harus sama untuk 9 baris.
- [ ] Pastikan link dev tidak berubah: isi `supabase/.temp/project-ref` tetap ref **dev**. (`npm run test:db` menolak
  berjalan bila link menunjuk ke project lain, jadi ini pengaman tambahan.)
- [ ] **Jangan pernah** menjalankan `npm run test:db` terhadap produksi, dan jangan mengisi `SUPABASE_DEV_PROJECT_REF`
  dengan ref produksi. Uji database menulis dan menghapus data.

Pemeriksaan di dashboard produksi, **SQL Editor**, New query, Run:

```sql
-- 1) Pengaturan satu baris, jadwal pemeliharaan harian, RLS aktif.
select (select count(*) from public.practice_settings) as baris_pengaturan,
       (select count(*) from cron.job where jobname = 'praktik-pemeliharaan-harian') as jadwal_harian,
       (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity) as tabel_tanpa_rls,
       (select count(*) from public.queue_entries) as antrean;
```

- [ ] Hasil: `baris_pengaturan = 1`, `jadwal_harian = 1`, `tabel_tanpa_rls = 0`, `antrean = 0`.
- [ ] **Advisors, Security Advisor**: tidak ada peringatan *ERROR*. Catat peringatan lain untuk ditinjau.

Kunci HMAC batas percobaan (`private.app_secrets`) dibuat acak oleh migrasi di setiap project, jadi produksi otomatis
punya kunci sendiri, berbeda dari dev.

### A5. Kunci API produksi Supabase

Dashboard produksi, **Project Settings, API Keys**:

- [ ] Salin **Project URL** (`https://<ref>.supabase.co`) ke pengelola kata sandi.
- [ ] Salin kunci **publishable** (`sb_publishable_...`). Boleh terlihat di browser.
- [ ] Buat kunci **secret** baru bernama `vercel-produksi` (`sb_secret_...`). Simpan langsung ke pengelola kata sandi.
  Jangan ditempel di chat, email, tangkapan layar, atau file di repo.
- [ ] Jangan memakai kunci dari project dev di produksi, dan sebaliknya.
- [ ] Kunci lama berbasis JWT (*Legacy API keys*: `anon`, `service_role`) tidak dipakai aplikasi. Matikan **setelah**
  A10 lulus (lihat A11).

### A6. Kunci Turnstile asli (Cloudflare)

Produksi **menolak** berjalan tanpa kunci asli: kunci uji Cloudflare ditolak bila `VERCEL_ENV` bukan `preview`, dan
pendaftaran gagal tertutup (`src/lib/turnstile-config.ts`).

- [ ] Cloudflare dashboard, **Turnstile**, **Add widget**:
  - Nama: `Antrean produksi`.
  - Hostname: `NAMA.vercel.app` (keputusan no. 2). Domain sendiri ditambahkan di B4. **Jangan** tambahkan
    `localhost`; development lokal dan Preview memakai kunci uji otomatis.
  - Mode: **Managed**. *Pre-clearance*: tidak.
- [ ] Simpan **Site key** (publik) dan **Secret key** (rahasia) di pengelola kata sandi.

### A7. Project Vercel (Hobby)

- [ ] Vercel, **Add New, Project**, impor repo GitHub. Nama project sesuai keputusan no. 2. Framework: **Next.js**
  (terdeteksi otomatis). Biarkan Build/Install command bawaan.
- [ ] **Sebelum deploy pertama**, isi variabel lingkungan (tabel di bawah). Bila deploy sudah terlanjur jalan tanpa
  variabel, deploy itu gagal saat dipakai; tidak apa-apa, isi lalu *Redeploy*.
- [ ] **Settings, Build and Deployment, Node.js Version**: **22.x** (sama dengan CI; `engines` meminta 22.12 ke atas).
- [ ] **Settings, Functions, Function Region**: **Singapore (sin1)**, dekat dengan database. Bawaan Vercel adalah
  Washington (`iad1`), yang membuat setiap permintaan menyeberang ke Amerika dan kembali. Hobby hanya boleh satu
  region; bila sin1 tidak bisa dipilih di Hobby, catat dan pilih di B3.
- [ ] **Settings, Git**: *Production Branch* = `main`. Branch lain menjadi Preview.
- [ ] **Settings, Deployment Protection**: *Vercel Authentication* aktif untuk Preview (bawaan). Preview memakai
  project dev, jadi jangan dibuka untuk umum.

#### Variabel lingkungan (dari `src/lib/env.ts`, `src/lib/env.server.ts`, `src/lib/turnstile.server.ts`)

Vercel, **Settings, Environment Variables**. Isi terpisah untuk **Production** dan **Preview**.

| Nama | Rahasia? | Production | Preview | Catatan |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Tidak | `https://NAMA.vercel.app` | `https://NAMA.vercel.app` | Wajib URL valid; aplikasi berhenti bila kosong. Ganti ke domain sendiri di B4. |
| `NEXT_PUBLIC_SUPABASE_URL` | Tidak | URL project **produksi** | URL project **dev** | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tidak | publishable **produksi** (`sb_publishable_...`) | publishable **dev** | Aplikasi menolak bila diisi kunci `sb_secret_`. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Ya**, server saja | secret **produksi** `vercel-produksi` (`sb_secret_...`) | secret **dev** | Tandai **Sensitive**. Tidak pernah diberi awalan `NEXT_PUBLIC_`. Aplikasi menolak kunci `sb_publishable_`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Tidak | Site key asli (A6) | **kosongkan** | Preview dengan kedua kunci kosong memakai kunci uji Cloudflare. |
| `TURNSTILE_SECRET_KEY` | **Ya**, server saja | Secret key asli (A6) | **kosongkan** | Tandai **Sensitive**. Isi keduanya atau kosongkan keduanya; satu saja ditolak. |

Jangan diisi di Vercel:

- `SUPABASE_DEV_PROJECT_REF` dan `SUPABASE_ALLOW_TEST_DB`: hanya untuk uji database lokal.
- `NODE_ENV`, `VERCEL_ENV`: diisi Vercel sendiri.
- Zona waktu: tidak lewat variabel; konstanta `APP_TIMEZONE` (Asia/Makassar) di `src/lib/time.ts`.

Penting: variabel `NEXT_PUBLIC_*` ditanam saat **build**. Setiap kali mengubahnya, lakukan **Redeploy** (tanpa build
cache) supaya nilai baru terpakai.

- [ ] Klik **Deploy**. Tunggu status *Ready*.

### A8. Site URL dan Redirect URLs Supabase

Aplikasi masuk dengan username dan kata sandi, tanpa tautan email, sehingga pengaturan ini tidak dipakai untuk login
sehari-hari. Tetap diisi benar supaya fitur Auth lain tidak mengarah ke alamat yang salah.

- [ ] Project **produksi**, Authentication, **URL Configuration**:
  - *Site URL*: `https://NAMA.vercel.app`
  - *Redirect URLs*: `https://NAMA.vercel.app/**`. **Tanpa** `localhost` dan tanpa URL Preview (keduanya memakai dev).
- [ ] Project **dev**, URL Configuration:
  - *Site URL*: `http://localhost:3000`
  - *Redirect URLs*: `http://localhost:3000/**` dan pola Preview Vercel, misalnya `https://NAMA-*-AKUN.vercel.app/**`
    (lihat alamat Preview yang sebenarnya di Vercel).

### A9. Akun staf asli

Ikuti `docs/prosedur-akun-staf-supabase.md` **bagian A** di project **produksi** (cek nama project di kiri atas).
Bagian C (pemetaan akun dev) tidak diperlukan.

- [ ] Akun **owner** (pemilik) dulu. Uji masuk di `https://NAMA.vercel.app/staf/masuk`, lalu ganti kata sandi
  sementara di halaman **Akun**.
- [ ] Pemilik memasang verifikasi dua langkah di halaman Akun (sangat dianjurkan untuk owner, karena akun ini bisa
  menghapus data pasien dan mengelola akun lain).
- [ ] Akun **doctor** untuk dr. Dhena, lalu akun **nurse** untuk setiap perawat.
- [ ] Serahkan username dan kata sandi sementara secara langsung. Setiap orang mengganti kata sandinya saat masuk
  pertama. Anjurkan dr. Dhena memasang verifikasi dua langkah.
- [ ] Jangan membuat akun `krisowner`, `krisdokter`, `krisperawat` (akun uji dev) di produksi. Bila pemilik butuh
  akun peran lain untuk uji, buat akun terpisah dan nonaktifkan setelah uji coba.

### A10. Pemeriksaan setelah deploy

#### Fungsi

- [ ] Beranda tampil dengan nama dokter dan jam dari Pengaturan.
- [ ] Owner atau dokter mengisi **Pengaturan** (keputusan no. 6), termasuk nomor WhatsApp praktik di Kontak dan
  privasi.
- [ ] Ambil nomor dari ponsel (data seperti pada bagian "Data uji di produksi" di bawah). Widget Turnstile tampil
  dan nomor terbit. Halaman nomor dan Antrean berjalan terbuka.
- [ ] Perawat masuk, melihat antrean, Panggil, Selesai, tandai tidak hadir, tombol WhatsApp membuka pesan yang benar.
- [ ] Jam perkiraan memakai WITA. Uji sekali antara pukul 00.00 dan 08.00 WITA (saat tanggal UTC masih kemarin):
  layar Pilih hari harus menampilkan tanggal WITA hari itu sebagai "hari ini".
- [ ] `/dokter/masuk` dan `/owner/masuk` mengalihkan ke `/staf/masuk`.

#### Region

- [ ] Buka DevTools (F12), tab **Network**, muat ulang beranda, klik permintaan pertama. Header `x-vercel-id` memuat
  `sin1`. Bila hanya `iad1`, region fungsi belum Singapura.

#### Header keamanan

Di terminal (ganti alamatnya):

```bash
curl -sI https://NAMA.vercel.app/
```

```bash
curl -sI https://NAMA.vercel.app/staf/masuk
```

Untuk `/antrean/...`, buka nomor antrean uji di browser, lalu lihat header di DevTools, Network.

| Header | Semua halaman | `/staf/*` dan `/antrean/*` |
|---|---|---|
| `content-security-policy` | ada, memuat `frame-ancestors 'none'`, `challenges.cloudflare.com`, `upgrade-insecure-requests`, **tanpa** `unsafe-eval` | sama |
| `strict-transport-security` | ada (diberikan Vercel) | sama |
| `x-frame-options` | `DENY` | sama |
| `x-content-type-options` | `nosniff` | sama |
| `referrer-policy` | `strict-origin-when-cross-origin` | sama |
| `permissions-policy` | `camera=(), microphone=(), geolocation=(), payment=()` | sama |
| `cross-origin-opener-policy` | `same-origin` | sama |
| `x-powered-by` | **tidak ada** | tidak ada |
| `x-robots-tag` | (tidak perlu) | `noindex, nofollow` |
| `cache-control` | (bebas) | `no-store` |

- [ ] Semua sesuai tabel.
- [ ] Konsol browser (DevTools, Console) di `/ambil` dan `/staf/akun` tanpa pesan pelanggaran CSP.
- [ ] Opsional: periksa `https://NAMA.vercel.app` di securityheaders.com (hanya alamat, tidak ada data pasien).

#### Rahasia tidak bocor

- [ ] Di DevTools, **Sources**, cari (Ctrl+Shift+F / Cmd+Option+F) `sb_secret_` dan `service_role`: tidak ada hasil.
  CI juga menjalankan `npm run check:bundle` di setiap pull request.
- [ ] Vercel, deploy terbaru, **Logs**: tidak ada nama, nomor WhatsApp, atau keluhan pasien; hanya kode galat.

#### Data uji di produksi

Uji di produksi tidak bisa dihindari. Supaya mudah dibersihkan:

- Pakai nama berawalan `UJI` dan **satu nomor WhatsApp milik pemilik** untuk semua antrean uji.
- Setelah uji selesai, pemilik membuka tab **Hapus data pasien**, mencari nomor itu, lalu menghapus (menganonimkan)
  semua antrean uji. Antrean yang masih menunggu atau diperiksa harus diselesaikan atau ditandai tidak hadir dulu.
- Nomor antrean yang sudah terpakai pada hari itu tidak kembali; uji di hari yang tidak dipakai pasien sungguhan, atau
  terima bahwa nomor pertama hari itu bukan 1.

### A11. Penggantian kunci dan pembersihan sebelum uji coba dimulai

- [ ] **Kunci dev yang pernah terlihat.** Bila kunci secret dev, kata sandi database dev, atau secret Turnstile pernah
  tampil di chat, tangkapan layar, rekaman layar, atau dikirim ke orang lain: buat kunci baru di dashboard dev, ganti
  di `.env.local` dan di variabel **Preview** Vercel, lalu hapus kunci lama.
- [ ] **Kunci produksi** hanya pernah ada di pengelola kata sandi dan Vercel. Bila tidak sengaja tersalin ke tempat
  lain, ganti sekarang (urutan: buat kunci baru, ganti di Vercel, Redeploy, uji, hapus kunci lama).
- [ ] **Legacy API keys produksi**: setelah A10 lulus, Project Settings, API Keys, *Legacy API keys*, nonaktifkan
  kunci JWT `anon` dan `service_role`. Uji ulang ambil nomor dan login staf. Bila gagal, aktifkan lagi dan laporkan.
- [ ] **Data uji produksi** dianonimkan (A10, "Data uji di produksi").
- [ ] **Project dev**: tidak pernah berisi data pasien sungguhan. Data uji dev boleh tetap ada (dipakai
  `npm run test:db`), tetapi **jangan menyalin** data atau akun apa pun dari dev ke produksi. Bila ada data pasien
  sungguhan yang terlanjur masuk dev (misalnya dari uji Preview), anonimkan lewat tab Hapus data pasien di dev.
- [ ] **Akun staf uji** di produksi (bila ada): nonaktifkan di halaman Akun.
- [ ] Ulangi daftar periksa `docs/tinjauan-keamanan.md` untuk produksi; butir "Cek manual" diperiksa di dashboard
  produksi.

### A12. Rencana uji coba 1 sampai 2 minggu

**Prinsip:** antrean kertas tetap siap setiap hari. Bila website bermasalah lebih dari 10 menit, perawat kembali ke
kertas dan mencatat jam kejadiannya.

| Waktu | Kegiatan | Siapa |
|---|---|---|
| Hari 0 (sebelum praktik buka) | Latihan 30 menit: pemilik bertindak sebagai pasien dari 2 sampai 3 ponsel, perawat memanggil dan menyelesaikan, dokter membuka Riwayat dan Pengaturan. Data uji lalu dianonimkan. | Pemilik, perawat, dokter |
| Hari 1 sampai 3 | Pasien **walk-in** diinput perawat lewat panel (pasien tidak mengambil nomor sendiri). Fokus: alur panel nyaman, perkiraan jam masuk akal. | Perawat |
| Hari 4 sampai 7 | Bila teks privasi sudah disetujui (keputusan no. 4): beberapa pasien kontrol diberi tautan dan diminta mengambil nomor sendiri. Walk-in tetap lewat panel. | Perawat, pasien terpilih |
| Minggu 2 | Semua pasien yang datang boleh memakai website. Belum ada poster/QR umum. | Semua |
| Akhir uji coba | Rapat singkat: lanjut, perbaiki dulu, atau hentikan. Kriteria Fase 7: perawat dan dokter menyatakan alurnya nyaman. | Pemilik, dokter, perawat |

Setiap hari praktik (5 menit, pemilik):

- [ ] Vercel, project, **Logs**: ada galat? (Hobby hanya menyimpan 1 jam, jadi cek setelah praktik tutup.)
- [ ] Supabase produksi, **Logs** dan **Reports**: ada lonjakan galat? Project tidak dijeda?
- [ ] Dokter atau pemilik mengekspor CSV hari itu di tab Riwayat (cadangan darurat selama paket gratis). Simpan di
  folder terenkripsi; hapus setelah pindah ke Pro dan cadangan otomatis berjalan.

Catatan masalah: buat satu tabel sederhana (kertas atau spreadsheet tanpa data pasien):

| Tanggal, jam | Siapa | Layar | Apa yang terjadi | Seberapa mengganggu (1 sampai 3) | Tindak lanjut |
|---|---|---|---|---|---|

Jangan menulis nama, nomor WhatsApp, atau keluhan pasien di catatan ini. Perbaikan kode dikerjakan lewat pull request
seperti biasa; setiap merge ke `main` otomatis ter-deploy ke produksi, jadi merge di luar jam praktik.

**Pemeriksaan akhir bagian A:** semua butir A1 sampai A11 tercentang, uji coba berjalan, dan dr. Dhena setuju lanjut.

---

## B. Peluncuran berbayar (Supabase Pro + Vercel Pro)

Urutan ini tidak memindahkan data: project Supabase dan project Vercel yang sama di-upgrade, jadi antrean uji coba
dan akun staf tetap ada.

### B1. Biaya (perkiraan, cek ulang)

| Layanan | Paket | Perkiraan | Catatan |
|---|---|---|---|
| Supabase | Pro | USD 25 per bulan per organisasi | Termasuk kredit komputasi USD 10 (cukup untuk satu instance Micro). Organisasi produksi terpisah membuat dev tetap gratis. |
| Vercel | Pro | USD 20 per bulan per kursi | Cukup satu kursi (pemilik). Termasuk kredit pemakaian; aplikasi kecil ini kemungkinan tidak melebihinya. Pasang batas belanja (*Spend Management*). |
| Domain | | tergantung ekstensi | Per tahun, di registrar. |

### B2. Supabase Pro

- [ ] Organisasi produksi, **Billing**, upgrade ke **Pro**. Biarkan *Spend Cap* aktif.
- [ ] **Database, Backups**: pastikan cadangan harian berjalan dan catat **masa simpannya** (Pro: 7 hari). Isi angka
  ini di Kebijakan Privasi saat naskah final (`docs/prosedur-hapus-data.md`).
- [ ] Authentication, Password: *Leaked password protection* **aktif** (bila belum bisa di A3).
- [ ] Uji pemulihan sekali (Fase 8): pahami langkah *Restore* di Backups. Catat siapa yang tahu caranya.
- [ ] Ekspor CSV harian selama uji coba boleh dihentikan; hapus file CSV lama dengan aman.

### B3. Vercel Pro

Vercel Pro berbentuk **tim**. Project di akun Hobby pribadi dipindahkan ke tim itu.

- [ ] Buat tim Pro, lalu project, **Settings, Advanced, Transfer** ke tim tersebut. Variabel lingkungan dan domain
  ikut pindah; cek ulang setelah transfer.
- [ ] **Function Region** tetap **sin1** (cek lagi; Pro boleh lebih dari satu region, cukup satu).
- [ ] **Spend Management**: batas belanja bulanan dan notifikasi.
- [ ] Opsional, **Firewall**: aturan *rate limit* untuk POST `/ambil` dan POST `/staf/masuk` sebagai lapisan di depan
  batas di database (`docs/catatan-fase-2.md`).
- [ ] Log runtime lebih panjang di Pro; pantau setelah peluncuran.

### B4. Domain sendiri

- [ ] Beli domain (keputusan no. 8). Aktifkan verifikasi dua langkah dan *domain lock* di registrar.
- [ ] Vercel, project, **Settings, Domains**: tambahkan `domainpraktik.com` (dan `www`, dialihkan ke salah satu).
  Pasang catatan DNS sesuai petunjuk Vercel. HTTPS otomatis.
- [ ] Alihkan `NAMA.vercel.app` ke domain baru (opsi *Redirect* di halaman Domains), supaya tautan lama pasien tetap
  jalan.
- [ ] Vercel, variabel **Production** `NEXT_PUBLIC_SITE_URL` = `https://domainpraktik.com`, lalu **Redeploy**.
- [ ] Supabase produksi, URL Configuration: *Site URL* = `https://domainpraktik.com`, *Redirect URLs* =
  `https://domainpraktik.com/**` (hapus alamat `.vercel.app` setelah pengalihan berjalan).
- [ ] Cloudflare Turnstile, widget produksi: tambahkan hostname `domainpraktik.com` (dan `www` bila dipakai). Hapus
  `NAMA.vercel.app` setelah pengalihan berjalan.
- [ ] Ulangi **A10** di domain baru (fungsi, region, header, rahasia).

### B5. Sebelum diumumkan ke pasien

- [ ] Teks privasi disetujui dr. Dhena dan pihak yang paham UU PDP; kotak "Draf" dihapus lewat pull request
  (`docs/catatan-fase-2.md`, bagian Fase 6). Teks menyebut lokasi pemrosesan data (Supabase Singapura, hosting yang
  dipilih) dan masa simpan cadangan.
- [ ] Penggantian kunci setelah uji coba: bila selama uji coba kunci produksi pernah ditangani di luar pengelola kata
  sandi, buat kunci secret Supabase dan secret Turnstile baru, ganti di Vercel, Redeploy, uji, hapus yang lama.
- [ ] Akun staf: hanya orang yang masih bekerja; akun uji dinonaktifkan.
- [ ] Poster dan kode QR memakai **domain sendiri** (Fase 8).
- [ ] `docs/rencana-insiden-kebocoran-data.md`: nomor darurat ketiga orang dicatat di luar sistem.

**Pemeriksaan akhir bagian B:** cadangan Supabase berjalan, domain sendiri lulus A10, teks privasi final, dan ada
orang yang tahu cara memulihkan data.

---

## C. Ringkasan urutan

1. Putuskan butir 1 sampai 4 di bagian 0.
2. A1 akun, A2 project Supabase, A3 Auth, A4 migrasi, A5 kunci Supabase, A6 Turnstile.
3. A7 Vercel dan variabel, deploy, A8 URL Supabase, A9 akun staf.
4. A10 pemeriksaan, A11 kunci dan pembersihan, A12 uji coba.
5. Setelah disetujui: B2 Supabase Pro, B3 Vercel Pro (atau bagian D), B4 domain, B5 sebelum diumumkan.

---

## D. Penilaian: Hostinger Node.js Web App sebagai alternatif Vercel Pro

Dinilai dari dokumentasi Hostinger (diperbarui Oktober sampai November 2026) dan kode di `main`. **Belum diuji di
Hostinger.** Data pasien tetap di Supabase (Singapura) dalam kedua pilihan; Hostinger hanya menggantikan Vercel
sebagai server aplikasi.

### D1. Kecocokan

| Hal | Status | Penjelasan |
|---|---|---|
| Paket | Cocok | Node.js Web App tersedia di **Business Web Hosting** dan **Cloud Startup** ke atas. Penggunaan komersial diizinkan (berbeda dengan Vercel Hobby). |
| Node.js | Cocok | Pilihan 18, 20, 22, 24. Pilih **22** (sama dengan CI). |
| Next.js 16 | Kemungkinan cocok, perlu diuji | Hostinger membangun Next.js dalam mode server dengan `output: "standalone"` yang **dipasang otomatis** dan menimpa nilai `output` di config. Config TypeScript (`next.config.ts`) dibaca untuk Next 15 ke atas. Config kita berbentuk objek (bukan fungsi), sesuai syarat Hostinger. |
| Server Actions | Kemungkinan cocok, perlu diuji | Dokumentasi menyebut Server Actions, API routes, dan middleware berjalan. Risiko: Next menolak Server Action bila header `Origin` tidak cocok dengan host yang dilihat server di belakang proxy Hostinger. Gejala: ambil nomor dan login gagal dengan galat "Invalid Server Actions request". |
| `proxy.ts` | Kemungkinan cocok | Server standalone menjalankan `proxy.ts` (pengganti middleware) di Node. Sesi staf dan pengalihan ke `/staf/masuk` perlu diuji. |
| `cacheComponents`, `partialPrefetching` | Kemungkinan cocok | Fitur ini bagian dari server Next sendiri, bukan fitur khusus Vercel. Halaman antrean tidak memakai `"use cache"`, jadi tidak bergantung pada cache bersama antar-server. |
| Header keamanan dan CSP | Perlu diuji, satu tambahan wajib | Header dari `next.config.ts` dikirim oleh server Next, tetapi Hostinger tidak mendokumentasikan apakah proxy di depannya (diatur lewat `.htaccess`) mempertahankan, menambah, atau meng-cache header. **HSTS** saat ini diberikan Vercel, bukan oleh kode; di Hostinger harus ditambahkan sendiri. |
| `Cache-Control: no-store` | Perlu diuji | Pastikan cache server Hostinger (bila ada) tidak menyimpan `/antrean/*` atau `/staf/*`. Bila tersimpan, pasien lain bisa melihat halaman nomor antrean orang lain. Ini pemeriksaan **wajib** sebelum dipakai pasien. |
| Variabel lingkungan | Cocok | Diisi di pengaturan aplikasi hPanel, dibaca saat build dan saat berjalan. `NEXT_PUBLIC_*` tetap ditanam saat build, jadi setelah diubah harus build ulang. Tidak ada pemisahan Production/Preview. |
| Turnstile | Cocok | `VERCEL_ENV` tidak ada di Hostinger, sehingga aplikasi selalu menganggapnya produksi dan mewajibkan kunci asli. Sesuai harapan. |
| IP klien untuk batas percobaan | **Perlu perubahan kode** | Lihat D2. |
| Lokasi server | Belum pasti | Lokasi pusat data dipilih saat membuat aplikasi; dokumentasi Node.js tidak mencantumkan daftar lokasi. Pilih yang **paling dekat dengan Singapura** (Singapura atau Indonesia bila tersedia di paket). Lokasi Eropa/Amerika menambah jeda setiap permintaan ke Supabase. |
| Deploy dari GitHub | Cocok | Push ke branch yang terhubung memicu build ulang. **Tidak ada Preview** per pull request seperti Vercel. |
| Proses berjalan | Catatan | Aplikasi dihentikan setelah sepi beberapa waktu dan dinyalakan lagi pada permintaan berikutnya. Pasien pertama setelah sepi bisa menunggu beberapa detik. |
| Batas sumber daya | Belum diketahui | Dokumentasi tidak menyebut angka RAM/CPU/proses untuk Node.js Web App. Build Next 16 butuh memori cukup besar; cek apakah build lulus di paket Business. |

### D2. Perubahan kode yang diperlukan (bila memilih Hostinger)

Dikerjakan lewat pull request terpisah, **setelah** keputusan, dan diuji di subdomain uji Hostinger sebelum dipakai
pasien.

1. **IP klien (`src/lib/rate-limit.ts`, `clientIpKey`).** Kode sekarang membaca `x-vercel-forwarded-for`, lalu
   `x-real-ip`, lalu entri **pertama** `x-forwarded-for`. Di Vercel, header itu diisi platform. Di belakang proxy
   lain:
   - bila proxy **menambahkan** IP ke `x-forwarded-for`, entri pertama bisa dipalsukan pengirim, sehingga batas per
     IP (ambil nomor 10, login 20 per 15 menit) bisa dilewati;
   - bila tidak ada header yang dikenali, semua pengunjung berbagi kunci `unknown`, sehingga **pasien ke-11 dalam 15
     menit ditolak** ("Terlalu banyak percobaan"). Ini risiko operasional nyata di jam ramai.

   Perubahan: tentukan header yang benar-benar diisi proxy Hostinger (uji dengan endpoint sementara yang hanya
   mencetak nama header, tanpa data pasien), lalu baca hanya header itu, atau entri **terakhir** `x-forwarded-for`
   yang ditambahkan proxy tepercaya. Tambahkan uji unit.
2. **HSTS (`next.config.ts`).** Tambahkan `Strict-Transport-Security: max-age=63072000; includeSubDomains` ke
   `securityHeaders`, hanya untuk produksi. (Aman juga di Vercel.)
3. **Server Actions di belakang proxy (bila uji menunjukkan galat).** Tambahkan domain produksi ke
   `experimental.serverActions.allowedOrigins` di `next.config.ts`, atau pastikan proxy meneruskan `x-forwarded-host`
   yang benar. Cek dulu dokumentasi Next 16 di `node_modules/next/dist/docs/`.
4. **Dokumen.** Kebijakan Privasi dan `docs/tinjauan-keamanan.md` menyebut Hostinger (dan lokasi servernya) sebagai
   pemroses, menggantikan Vercel. `docs/rencana-insiden-kebocoran-data.md`: rotasi kunci dilakukan di hPanel.
5. **Tidak perlu diubah:** `turnstile-config.ts` (sudah benar tanpa `VERCEL_ENV`), `proxy.ts`, `cacheComponents`,
   skema database, CSP (selama header terkirim utuh).

### D3. Risiko untuk data pasien

- **Kunci secret Supabase disimpan di Hostinger.** Siapa pun yang menguasai akun Hostinger (hPanel) bisa membaca
  kunci itu dan seluruh data pasien. Akun Hostinger wajib verifikasi dua langkah, sama seperti Supabase.
- **Hosting bersama (Business).** Aplikasi berjalan di server yang dipakai pelanggan lain. Hostinger mengisolasi akun,
  tetapi isolasinya lebih lemah daripada fungsi terisolasi Vercel. Cloud Startup memberi sumber daya khusus, lebih
  disarankan daripada Business.
- **Cache halaman pribadi.** Bila lapisan cache Hostinger mengabaikan `no-store`, halaman nomor antrean atau panel
  staf bisa tersaji ke orang lain (D1). Wajib diuji.
- **Batas percobaan melemah** sampai D2 butir 1 selesai.
- **Lokasi server di luar Indonesia** berarti transfer data ke luar negeri (sama halnya dengan Vercel). Sebutkan di
  Kebijakan Privasi.
- **Log runtime** berisi keluaran `console.*` aplikasi. Kode tidak mencatat nama, WhatsApp, atau keluhan, jadi
  risikonya sama dengan di Vercel.
- **Tanpa Preview**, perubahan langsung diuji di produksi atau di aplikasi uji kedua. Saran: buat aplikasi Hostinger
  kedua di subdomain (misalnya `uji.domainpraktik.com`) yang memakai project Supabase dev.

### D4. Saran

Untuk praktik kecil dengan satu pengelola teknis, **Vercel Pro lebih sederhana dan lebih kecil risikonya**: kode
sudah diuji di sana, region Singapura tersedia, Preview per pull request, HSTS dan IP klien diurus platform.
Hostinger layak dipertimbangkan bila selisih biaya penting dan pemilik sudah memakai Hostinger, dengan syarat:
paket Cloud Startup (bukan Business), pusat data Asia terdekat, D2 butir 1 sampai 3 selesai dan diuji, serta
pemeriksaan header dan cache di A10 lulus di Hostinger sebelum pasien memakainya.

Sumber: docs.hostinger.com/node.js (overview, creating-an-app, overview-1/next), github.com/hostinger/deploy-nextjs,
vercel.com/docs/plans/hobby, vercel.com/docs/functions/configuring-functions/region, vercel.com/docs/limits/fair-use-guidelines,
supabase.com/pricing.
