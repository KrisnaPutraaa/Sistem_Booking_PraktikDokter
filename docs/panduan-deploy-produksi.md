# Panduan deploy produksi (Fase 7)

Daftar periksa berurutan untuk pemilik proyek. Disusun 5 November 2026 dari panduan PDF (bagian 3 dan Fase 7),
`docs/catatan-fase-2.md`, `docs/kebijakan-akun-staf.md`, `docs/prosedur-akun-staf-supabase.md`,
`docs/tinjauan-keamanan.md`, dan kode di `main` (Fase 1 sampai 6).

Rencana biaya:

- **Bagian A, uji coba gratis (satu bulan, dengan data pasien sungguhan):** Supabase Free + Vercel Hobby, alamat
  `nama.vercel.app`. Karena paket gratis tanpa cadangan otomatis, cadangan harian dibuat sendiri dari Mac (A13).
  *(Revisi 5 November 2026: sebelumnya 1 sampai 2 minggu dengan data seminimal mungkin.)*
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
| 4 | **Teks privasi masih DRAF** (wajib sebelum hari pertama) | Halaman `/kebijakan-privasi` masih menampilkan kotak "Draf" ke pasien. Karena uji coba memakai data pasien sungguhan sejak awal, dr. Dhena (dan pihak yang paham UU PDP) menyetujui teksnya **sebelum** pasien pertama, lalu kotak Draf dihapus lewat pull request (perubahan kode kecil, di luar dokumen ini). Teks perlu menyebut: data diproses di Supabase (Singapura) dan Vercel, ada salinan cadangan di komputer pengelola yang disimpan paling lama sekitar 2 minggu (A13), dan masa simpan cadangan Supabase setelah upgrade. Bila belum disetujui, minggu pertama hanya pasien walk-in yang diinput perawat. | |
| 5 | **Cakupan uji coba** | Siapa yang ikut, mulai tanggal berapa, dan apakah pasien diberi tahu bahwa ini uji coba. Saran: selalu siapkan antrean kertas sebagai cadangan. | |
| 6 | **Nilai Pengaturan praktik** | Kuota harian, rata-rata durasi, jam buka dan tutup, hari buka, batas pendaftaran hari yang sama, nomor WhatsApp praktik, alamat. Bawaan: 20 pasien, 15 menit, 17.30 sampai 23.00, Senin sampai Sabtu. Diisi dr. Dhena atau pemilik di halaman Pengaturan setelah deploy. | |
| 7 | **Hosting berbayar** | Vercel Pro (paling sedikit perubahan) atau Hostinger (perlu perubahan kode, lihat bagian D). Boleh diputuskan di akhir uji coba. | |
| 8 | **Nama domain untuk peluncuran** | Misalnya `antreandrdhena.com`. Daftarkan atas nama praktik atau dr. Dhena, dengan email yang dikuasai praktik dan verifikasi dua langkah. Poster dan kode QR dicetak **setelah** domain ini aktif. | |
| 9 | **Pemegang akun dan kartu pembayaran** | Akun Supabase, Vercel, Cloudflare, GitHub, registrar domain: atas nama siapa, email apa, kartu siapa. Semuanya wajib verifikasi dua langkah. | |
| 10 | **Tanggal upgrade ke paket berbayar** | Rencana: satu bulan setelah hari pertama. Tulis tanggalnya di kalender. Upgrade lebih cepat bila salah satu pemicu di A15 terjadi. | |
| 11 | **Mac untuk cadangan harian** | Mac mana yang membuat cadangan (A13), dan siapa penggantinya bila pemilik berhalangan. Mac itu wajib FileVault aktif dan tidak dipakai bersama. | |

---

## A. Uji coba gratis (Supabase Free + Vercel Hobby)

### Sebelum mulai: risiko selama sebulan

Baca **A15** (risiko yang tersisa dan pemicu upgrade lebih cepat) sebelum A1. Tiga hal yang wajib berjalan sejak hari
pertama: cadangan harian (A13), daftar periksa harian dan mingguan (A14), dan teks privasi yang sudah disetujui
(keputusan no. 4).

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

> **Status per 5 November 2026:**
> - Project Vercel `antrean-dr-dhena` (Hobby) sudah dibuat. Enam variabel lingkungan Production sudah diisi; dua yang
>   rahasia (`SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`) bertanda Secret.
> - Project Supabase produksi `praktik-tht-prod` sudah dibuat, dan migrasi 9 berkas sudah terpasang (A2, A4).
> - Kunci Turnstile asli sudah dibuat (A6).
> - Di Vercel versi baru, tombol **Create Project** tidak langsung memulai deploy pertama. Deploy pertama dipicu
>   lewat commit ke `main` (misalnya saat pull request di-merge), bukan lewat tombol **Deploy** di bawah.

- [ ] Vercel, **Add New, Project**, impor repo GitHub. Nama project sesuai keputusan no. 2. Framework: **Next.js**
  (terdeteksi otomatis). Biarkan Build/Install command bawaan.
- [ ] **Sebelum deploy pertama**, isi variabel lingkungan (tabel di bawah). Bila deploy sudah terlanjur jalan tanpa
  variabel, deploy itu gagal saat dipakai; tidak apa-apa, isi lalu *Redeploy*.
- [ ] **Settings, Build and Deployment, Node.js Version**: **22.x** (sama dengan CI).
  - Sejak 5 November 2026, `engines.node` di `package.json` (dan `package-lock.json`) adalah `^22.12.0`. Artinya
    minimal 22.12, dan hanya versi 22. Sebelumnya `>=22.12.0`, yang membiarkan Vercel memakai Node 24 atau versi lebih
    baru.
  - Vercel mengikuti `engines` dan mengabaikan pilihan di dashboard bila keduanya berbeda. Jadi deploy tetap
    memakai Node 22 meskipun pengaturan dashboard terlanjur 24.x. Log build memberi peringatan bila keduanya
    tidak sama; samakan ke 22.x.
  - Sudah diuji di Node 22.23.4: `npm ci --engine-strict` dan `npm run build` lolos. Tidak ada dependensi atau
    kode aplikasi yang berubah. Repo tidak memakai `.nvmrc`; Vercel tidak membacanya.
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

- [ ] Klik **Deploy**. Tunggu status *Ready*. Bila tombol itu tidak ada (Vercel versi baru), deploy dimulai oleh
  commit berikutnya ke `main`; pantau di tab **Deployments**.

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

### A12. Rencana uji coba satu bulan

**Prinsip:** antrean kertas tetap siap setiap hari. Bila website bermasalah lebih dari 10 menit, perawat kembali ke
kertas dan mencatat jam kejadiannya.

| Waktu | Kegiatan | Siapa |
|---|---|---|
| Hari 0 (sebelum praktik buka) | Latihan 30 menit: pemilik bertindak sebagai pasien dari 2 sampai 3 ponsel, perawat memanggil dan menyelesaikan, dokter membuka Riwayat dan Pengaturan. Data uji lalu dianonimkan. Cadangan pertama dibuat (A13) **sebelum** pasien sungguhan masuk. | Pemilik, perawat, dokter |
| Minggu 1 | Pasien **walk-in** diinput perawat lewat panel. Bila teks privasi sudah disetujui, beberapa pasien kontrol diberi tautan untuk mengambil nomor sendiri. Fokus: alur panel nyaman, perkiraan jam masuk akal. **Latihan pemulihan** cadangan sekali (A13.7). | Perawat, pemilik |
| Minggu 2 | Semua pasien yang datang boleh memakai website. Belum ada poster/QR umum. | Semua |
| Minggu 3 | Tinjau catatan masalah, kerjakan perbaikan kecil lewat pull request (merge di luar jam praktik). | Pemilik |
| Minggu 4 | Rapat singkat: lanjut ke paket berbayar, perbaiki dulu, atau hentikan. Kriteria Fase 7: perawat dan dokter menyatakan alurnya nyaman. Lalu B0. | Pemilik, dokter, perawat |

Pemeriksaan harian dan mingguan ada di **A14**.

Catatan masalah: buat satu tabel sederhana (kertas atau spreadsheet tanpa data pasien):

| Tanggal, jam | Siapa | Layar | Apa yang terjadi | Seberapa mengganggu (1 sampai 3) | Tindak lanjut |
|---|---|---|---|---|---|

Jangan menulis nama, nomor WhatsApp, atau keluhan pasien di catatan ini. Perbaikan kode dikerjakan lewat pull request
seperti biasa; setiap merge ke `main` otomatis ter-deploy ke produksi, jadi merge di luar jam praktik.

### A13. Cadangan database harian dari Mac

Supabase Free tidak membuat cadangan. Selama sebulan, cadangan dibuat sendiri setiap malam dari Mac pemilik dengan
`pg_dump` (alat resmi PostgreSQL), lewat skrip yang:

- membaca kata sandi database dari **Keychain** macOS, sehingga kata sandi tidak pernah tampil di layar, tidak masuk
  riwayat terminal, dan tidak tertulis di file;
- menyimpan cadangan di `~/CadanganPraktikTHT/cadangan` (di luar folder repo dan di luar folder Documents/Desktop
  yang bisa tersinkron ke iCloud), dengan izin hanya untuk pengguna Mac itu;
- menyimpan hanya **14 cadangan terbaru** (sekitar dua minggu) dan menghapus yang lebih lama;
- berhenti tanpa menghapus cadangan lama bila koneksi gagal atau hasilnya tidak lengkap.

**Isi cadangan:** data semua tabel aplikasi (`public`: antrean, pengaturan, hari libur, profil staf, audit log;
`private`: kunci HMAC, kode pemulihan MFA, saklar MFA) serta akun staf Supabase Auth (`auth.users`,
`auth.identities`, `auth.mfa_factors`, berisi hash kata sandi dan rahasia verifikasi dua langkah). Struktur tabel
tidak ikut; struktur dibuat ulang dari `supabase/migrations/`. Catatan batas percobaan dan sesi login tidak ikut.

> **File cadangan berisi seluruh data pasien dan hash kata sandi staf.** Perlakukan seperti kunci rahasia: jangan
> dikirim lewat chat atau email, jangan diunggah ke Google Drive/iCloud/Dropbox, jangan disalin ke flashdisk biasa.

Skrip sudah diuji dengan `pg_dump`/`psql` tiruan (rotasi 14 file, kegagalan koneksi, Keychain kosong, penjaga
pemulihan). **Koneksi sungguhan ke Supabase belum diuji**; karena itu langkah A13.5 dan latihan pemulihan A13.7 wajib.

#### A13.1. Syarat Mac

- [ ] **FileVault aktif.** Terminal: `fdesetup status` harus `FileVault is On.` (Mac pemilik saat ini: aktif.)
- [ ] Mac tidak dipakai bersama, terkunci dengan kata sandi, dan layar terkunci otomatis.
- [ ] Alat PostgreSQL terpasang (sudah ada di Mac pemilik, versi 17.4):

  ```bash
  /opt/homebrew/opt/libpq/bin/pg_dump --version
  ```

  Bila tidak ditemukan: `brew install libpq`. Versi utama `pg_dump` harus **sama atau lebih baru** dari Postgres
  Supabase (project dev saat ini Postgres 17). Bila Supabase kelak memakai Postgres 18, jalankan
  `brew upgrade libpq`.
- [ ] **Time Machine**: bila disk Time Machine **tidak** terenkripsi, keluarkan folder cadangan dari Time Machine:

  ```bash
  tmutil addexclusion ~/CadanganPraktikTHT
  ```

#### A13.2. Simpan kata sandi database produksi di Keychain (sekali)

Ganti `REF_PRODUKSI` dengan ref dari A2. Perintah ini **meminta** kata sandi (dua kali) tanpa menampilkannya; tempel
kata sandi database produksi dari pengelola kata sandi saat diminta:

```bash
security add-generic-password -s praktik-tht-produksi-db -a REF_PRODUKSI -w
```

Bila kata sandi database diganti kelak, jalankan perintah yang sama dengan tambahan `-U` sebelum `-w`.

#### A13.3. Pasang skrip cadangan

1. Buat folder pribadi:

   ```bash
   mkdir -p ~/CadanganPraktikTHT/cadangan && chmod 700 ~/CadanganPraktikTHT ~/CadanganPraktikTHT/cadangan
   ```

2. Salin **seluruh** isi blok skrip di bawah (dari `#!/bin/bash` sampai baris `echo "Selesai...`), lalu jalankan
   perintah ini untuk menempelkannya ke file (jangan pakai TextEdit; TextEdit bisa mengubah tanda kutip):

   ```bash
   pbpaste > ~/CadanganPraktikTHT/cadangkan.sh && chmod 700 ~/CadanganPraktikTHT/cadangkan.sh
   ```

3. Buka file dengan `nano ~/CadanganPraktikTHT/cadangkan.sh`, isi dua nilai di bagian "Isi sekali", simpan
   (Ctrl+O, Enter), keluar (Ctrl+X):
   - `PROJECT_REF`: ref produksi (A2).
   - `POOLER_HOST`: dashboard project produksi, tombol **Connect** di atas, pilih **Session pooler**, salin bagian
     host (bentuknya `aws-0-ap-southeast-1.pooler.supabase.com`; angka `aws-0`/`aws-1` bisa berbeda per project).
     Session pooler dipakai karena alamat database langsung di paket Free hanya IPv6, yang sering tidak didukung
     jaringan rumah.

```bash
#!/bin/bash
# Cadangan database produksi Praktik THT (data saja; struktur ada di supabase/migrations).
# Kata sandi dibaca dari Keychain dan tidak pernah dicetak.
set -euo pipefail
umask 077

# ---- Isi sekali. Bukan rahasia. ----
PROJECT_REF="ISI_REF_PRODUKSI"
POOLER_HOST="ISI_HOST_SESSION_POOLER"
SIMPAN=14
# -------------------------------------

AKAR="$HOME/CadanganPraktikTHT"
FOLDER="$AKAR/cadangan"
KEYCHAIN_SERVICE="praktik-tht-produksi-db"
BIN="${BIN:-/opt/homebrew/opt/libpq/bin}"
[ -x "$BIN/pg_dump" ] || BIN="/usr/local/opt/libpq/bin"

if [[ ! "$PROJECT_REF" =~ ^[a-z0-9]{20}$ ]]; then
  echo "Berhenti: PROJECT_REF belum diisi dengan ref produksi (20 huruf kecil/angka)."; exit 1
fi
if [[ ! "$POOLER_HOST" =~ \.pooler\.supabase\.com$ ]]; then
  echo "Berhenti: POOLER_HOST belum diisi (host Session pooler, berakhiran .pooler.supabase.com)."; exit 1
fi
if [ ! -x "$BIN/pg_dump" ]; then
  echo "Berhenti: pg_dump tidak ditemukan. Jalankan: brew install libpq"; exit 1
fi

mkdir -p "$FOLDER"
chmod 700 "$AKAR" "$FOLDER"

if ! PGPASSWORD="$(security find-generic-password -s "$KEYCHAIN_SERVICE" -a "$PROJECT_REF" -w 2>/dev/null)"; then
  echo "Berhenti: kata sandi database belum disimpan di Keychain (lihat langkah A13.2)."; exit 1
fi
export PGPASSWORD
export PGHOST="$POOLER_HOST" PGPORT=5432 PGUSER="postgres.$PROJECT_REF" PGDATABASE=postgres
export PGSSLMODE=require PGCONNECT_TIMEOUT=20 PGAPPNAME=cadangan-praktik

NAMA="praktik-$(TZ=Asia/Makassar date +%Y-%m-%d_%H%M).sql.gz"
SEMENTARA="$FOLDER/.sedang-dibuat.sql.gz"
trap 'rm -f "$SEMENTARA"' EXIT

echo "Membuat cadangan..."
"$BIN/pg_dump" --data-only --no-owner --no-privileges \
  --table='public.*' --table='private.*' \
  --table=auth.users --table=auth.identities --table=auth.mfa_factors \
  --exclude-table-data=private.rate_limit_hits \
  | gzip -9 > "$SEMENTARA"

gzip -t "$SEMENTARA"
if ! gzip -dc "$SEMENTARA" | grep -q '^COPY public.queue_entries '; then
  echo "Berhenti: isi cadangan tidak lengkap (tabel antrean tidak ditemukan). Cadangan lama tidak dihapus."; exit 1
fi
mv "$SEMENTARA" "$FOLDER/$NAMA"

# Simpan hanya $SIMPAN cadangan terbaru.
ls -1t "$FOLDER"/praktik-*.sql.gz | tail -n +"$((SIMPAN + 1))" | while IFS= read -r lama; do
  rm -f "$lama"
done

JUMLAH=$(ls -1 "$FOLDER"/praktik-*.sql.gz | wc -l | tr -d ' ')
UKURAN=$(du -h "$FOLDER/$NAMA" | cut -f1)
echo "Selesai: $NAMA ($UKURAN). Cadangan tersimpan: $JUMLAH."
```

#### A13.4. Pasang skrip pemulihan

Dengan cara yang sama (salin blok di bawah, lalu `pbpaste`):

```bash
pbpaste > ~/CadanganPraktikTHT/pulihkan.sh && chmod 700 ~/CadanganPraktikTHT/pulihkan.sh
```

Skrip ini **hanya** mau memulihkan ke project yang sudah dimigrasi dan masih kosong (tanpa akun dan antrean), meminta
kata sandi project tujuan tanpa menampilkannya, meminta konfirmasi `PULIHKAN`, dan berjalan dalam satu transaksi
(berhasil semua atau tidak ada yang berubah).

```bash
#!/bin/bash
# Pulihkan cadangan ke project Supabase BARU yang sudah dimigrasi dan masih kosong.
# Pemakaian: ./pulihkan.sh REF_TUJUAN HOST_SESSION_POOLER_TUJUAN /jalur/praktik-....sql.gz
set -euo pipefail
umask 077

TARGET_REF="${1:-}"
POOLER_HOST="${2:-}"
FILE="${3:-}"
BIN="${BIN:-/opt/homebrew/opt/libpq/bin}"
[ -x "$BIN/psql" ] || BIN="/usr/local/opt/libpq/bin"

if [[ ! "$TARGET_REF" =~ ^[a-z0-9]{20}$ ]] || [[ ! "$POOLER_HOST" =~ \.pooler\.supabase\.com$ ]] || [ ! -f "$FILE" ]; then
  echo "Pemakaian: ./pulihkan.sh REF_TUJUAN HOST_SESSION_POOLER_TUJUAN /jalur/praktik-....sql.gz"; exit 1
fi
gzip -t "$FILE"

read -r -s -p "Kata sandi database project TUJUAN (tidak tampil saat diketik): " PGPASSWORD
echo
export PGPASSWORD
export PGHOST="$POOLER_HOST" PGPORT=5432 PGUSER="postgres.$TARGET_REF" PGDATABASE=postgres
export PGSSLMODE=require PGCONNECT_TIMEOUT=20 PGAPPNAME=pulihkan-praktik

# Penjaga: tujuan harus sudah dimigrasi dan belum punya akun atau antrean.
ISI=$("$BIN/psql" -X -A -t -v ON_ERROR_STOP=1 \
  -c "select (select count(*) from public.queue_entries) + (select count(*) from auth.users)")
if [ "$ISI" != "0" ]; then
  echo "Ditolak: project tujuan sudah berisi akun atau antrean. Pemulihan hanya ke project baru yang kosong."; exit 1
fi

echo "Akan memulihkan $(basename "$FILE") ke project $TARGET_REF."
read -r -p "Ketik PULIHKAN untuk melanjutkan: " SETUJU
[ "$SETUJU" = "PULIHKAN" ] || { echo "Dibatalkan."; exit 1; }

# Satu transaksi: berhasil semua atau tidak ada yang berubah.
# Baris bawaan migrasi (pengaturan, kunci HMAC, saklar MFA) diganti isi cadangan.
gzip -dc "$FILE" | "$BIN/psql" -X -q -v ON_ERROR_STOP=1 --single-transaction \
  -c "set session_replication_role = replica" \
  -c "truncate public.practice_settings, private.app_secrets, private.security_settings" \
  -f -

"$BIN/psql" -X -v ON_ERROR_STOP=1 -c "select
  (select count(*) from public.queue_entries) as antrean,
  (select max(queue_date) from public.queue_entries) as tanggal_terakhir,
  (select count(*) from public.profiles) as akun_staf"
echo "Pemulihan selesai."
```

`session_replication_role = replica` mematikan trigger dan pemeriksaan relasi selama pemulihan, supaya data masuk
apa adanya (termasuk audit log dan antrean yang sudah dianonimkan) tanpa dicatat ulang sebagai perubahan baru.

#### A13.5. Cadangan pertama (manual)

- [ ] Setelah A4 dan **sebelum** pasien pertama:

  ```bash
  ~/CadanganPraktikTHT/cadangkan.sh
  ```

  Hasil yang benar: `Selesai: praktik-2026-..-.._....sql.gz (...). Cadangan tersimpan: 1.` Bila muncul galat
  koneksi, cek `POOLER_HOST`, `PROJECT_REF`, dan kata sandi di Keychain (A13.2). Pesan galat tidak berisi kata sandi.
- [ ] Jangan membuka isi file cadangan untuk "melihat-lihat"; isinya data pasien.

#### A13.6. Jadwal otomatis setiap malam (opsional, disarankan)

macOS menjalankan skrip setiap hari pukul **23.45** (jam Mac; pastikan zona waktu Mac WITA). Bila Mac tidur pada jam
itu, skrip berjalan saat Mac bangun. Bila Mac mati, tidak ada cadangan hari itu; daftar periksa harian (A14)
menangkapnya.

Pasang (satu perintah, salin utuh):

```bash
cat > ~/Library/LaunchAgents/id.praktik-tht.cadangan.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>id.praktik-tht.cadangan</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$HOME/CadanganPraktikTHT/cadangkan.sh</string></array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>23</integer><key>Minute</key><integer>45</integer></dict>
  <key>StandardOutPath</key><string>$HOME/CadanganPraktikTHT/log-cadangan.txt</string>
  <key>StandardErrorPath</key><string>$HOME/CadanganPraktikTHT/log-cadangan.txt</string>
</dict>
</plist>
EOF
```

Aktifkan:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/id.praktik-tht.cadangan.plist
```

Uji sekarang tanpa menunggu malam, lalu lihat baris terakhir log:

```bash
launchctl kickstart gui/$(id -u)/id.praktik-tht.cadangan
```

```bash
tail -n 3 ~/CadanganPraktikTHT/log-cadangan.txt
```

Log hanya berisi pesan skrip (nama file, ukuran, atau pesan galat); tidak berisi kata sandi atau data pasien. Bila
macOS menanyakan izin akses Keychain untuk `security`, pilih **Always Allow**.

Mematikan jadwal (misalnya setelah upgrade, B0):

```bash
launchctl bootout gui/$(id -u)/id.praktik-tht.cadangan
```

#### A13.7. Latihan pemulihan (wajib sekali di minggu pertama)

Cadangan yang belum pernah dipulihkan belum terbukti. Latihan ini memakai project sementara yang dihapus lagi.

1. Paket Free hanya boleh 2 project aktif. **Jeda project dev** dulu: dashboard dev, Project Settings, General,
   **Pause project**. (`npm run test:db` tidak bisa dipakai selama dev dijeda.)
2. Di organisasi produksi, buat project baru `praktik-tht-uji-pulih`, region Singapore, kata sandi database acak
   (simpan sementara di pengelola kata sandi).
3. Pasang struktur tabel ke project itu (ganti `REF_UJI`):

   ```bash
   npx supabase db push --remote=REF_UJI
   ```

4. Ambil host Session pooler project itu (tombol **Connect**), lalu pulihkan cadangan terbaru:

   ```bash
   ~/CadanganPraktikTHT/pulihkan.sh REF_UJI HOST_POOLER_UJI "$(ls -1t ~/CadanganPraktikTHT/cadangan/praktik-*.sql.gz | head -n 1)"
   ```

5. Bandingkan ringkasan (`antrean`, `tanggal_terakhir`, `akun_staf`) dengan produksi. Di SQL Editor **produksi**:

   ```sql
   select count(*) as antrean, max(queue_date) as tanggal_terakhir,
          (select count(*) from public.profiles) as akun_staf
   from public.queue_entries;
   ```

   Angka antrean produksi boleh sedikit lebih besar (antrean setelah cadangan dibuat); yang lain harus sama.
6. **Hapus** project `praktik-tht-uji-pulih` (Project Settings, General, Delete project), karena berisi data pasien
   sungguhan. Hapus juga kata sandinya dari pengelola kata sandi.
7. Lanjutkan lagi project dev (**Restore project**).
8. Catat tanggal dan hasil latihan di catatan pemilik. Bila gagal, salin pesan galatnya (tanpa data pasien) dan
   minta bantuan sebelum minggu kedua.

#### A13.8. Pemulihan sungguhan (bila project produksi hilang atau rusak)

Pakai hanya bila project produksi terhapus, datanya rusak parah, atau tidak bisa dipulihkan dari jeda. Bila project
hanya **dijeda**, cukup **Restore project** di dashboard; tidak perlu cadangan.

1. Perawat beralih ke antrean kertas. Catat jam kejadian.
2. Buat project produksi baru (A2), atur Auth (A3), jalankan migrasi (A4) ke ref baru. **Jangan** membuat akun staf.
   Bila batas 2 project aktif menghalangi, jeda project dev dulu (A13.7 langkah 1).
3. Pulihkan cadangan terbaru dengan `pulihkan.sh` (seperti A13.7 langkah 4) ke ref baru.
4. Buat kunci API baru (A5), ganti variabel **Production** Vercel (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), **Redeploy**. Isi URL Configuration (A8).
5. Ganti ref di `cadangkan.sh` dan di Keychain (A13.2) ke project baru.
6. Staf masuk dengan kata sandi lama (hash ikut dipulihkan). Tautan nomor antrean pasien tetap berlaku.
7. Antrean yang dibuat setelah cadangan terakhir **hilang**: perawat memasukkan ulang pasien hari itu sebagai walk-in
   dari catatan kertas.
8. Ulangi A10. Bila kejadiannya bukan sekadar kerusakan teknis (misalnya dugaan akses tidak sah), ikuti
   `docs/rencana-insiden-kebocoran-data.md`.

Jangan memulihkan ke project produksi yang masih dipakai: skrip menolaknya. Kesalahan kecil (status salah, pasien
salah ditandai) diperbaiki lewat panel, bukan dengan pemulihan.

### A14. Daftar periksa harian dan mingguan

#### Perawat, setiap hari praktik

Sebelum praktik buka:

- [ ] Buka panel `/staf` di komputer praktik dan masuk dengan akun sendiri. Antrean hari ini tampil.
- [ ] Bila panel tidak terbuka atau galat lebih dari 10 menit: pakai antrean kertas, kabari pemilik.

Selama praktik:

- [ ] Pasien datang tanpa nomor: tambahkan sebagai walk-in di panel (bukan di kertas), kecuali sedang memakai kertas.
- [ ] Setiap pasien ditandai Panggil, Selesai, atau Tidak hadir pada saatnya.
- [ ] Jangan memberikan kata sandi kepada siapa pun, termasuk sesama staf.

Setelah praktik tutup:

- [ ] Tidak ada pasien yang masih "menunggu" atau "diperiksa"; tandai Selesai atau Tidak hadir.
- [ ] Bila memakai kertas hari ini, masukkan pasien dari kertas ke panel bila masih bisa, lalu simpan kertasnya
  sesuai kebiasaan praktik.
- [ ] Tulis masalah hari ini di catatan masalah (tanpa nama, nomor WhatsApp, atau keluhan pasien).
- [ ] Tekan **Keluar** bila komputer dipakai bersama.

#### Pemilik, setiap hari praktik (sekitar 10 menit, setelah praktik tutup)

- [ ] **Cadangan:** jalankan `~/CadanganPraktikTHT/cadangkan.sh`, atau bila jadwal otomatis aktif, pastikan esok
  paginya ada file bertanggal kemarin malam:

  ```bash
  ls -lt ~/CadanganPraktikTHT/cadangan | head -n 3
  ```

  Bila cadangan gagal dua malam berturut-turut, perbaiki hari itu juga (pemicu A15).
- [ ] **Vercel, Logs:** ada galat merah? Hobby hanya menyimpan log **1 jam**, jadi cek segera setelah praktik tutup,
  atau segera setelah perawat melapor masalah.
- [ ] **Supabase produksi:** status project **aktif** (bukan *Paused*). Cek email akun Supabase untuk pemberitahuan
  jeda atau pemakaian.
- [ ] Baca catatan masalah dari perawat.

#### Pemilik, setiap minggu (sekitar 30 menit)

- [ ] **Cadangan:** jumlah file paling banyak 14, file terbaru kurang dari 24 jam, ukurannya wajar (tidak
  tiba-tiba jauh lebih kecil). Minggu pertama: latihan pemulihan A13.7.
- [ ] **Supabase, Usage:** ukuran database dan transfer jauh di bawah batas Free (database 500 MB). Bila mendekati
  setengahnya, upgrade lebih cepat.
- [ ] **Supabase, Advisors, Security Advisor:** tidak ada peringatan baru.
- [ ] **Supabase, Authentication, Users:** hanya akun staf yang dikenal; tidak ada akun baru yang tidak dibuat
  pemilik.
- [ ] **Audit log** (Table Editor, `audit_log`, urutkan terbaru): tidak ada perubahan pengaturan, hapus data, atau
  aksi akun yang tidak dikenali.
- [ ] **Vercel, Usage:** jauh di bawah batas Hobby. Di Hobby, melewati batas membuat fitur berhenti sampai 30 hari,
  artinya website bisa mati. Bila mendekati, upgrade ke Pro lebih cepat.
- [ ] **Vercel, Deployments:** hanya deploy yang memang dari merge pemilik.
- [ ] **GitHub:** peringatan Dependabot dan secret scanning.
- [ ] **Mac cadangan:** `fdesetup status` masih aktif; macOS diperbarui.
- [ ] **Mencegah jeda Supabase Free:** jeda terjadi setelah sekitar 1 minggu tanpa aktivitas. Pemakaian praktik
  Senin sampai Sabtu dan cadangan harian kemungkinan besar sudah cukup, tetapi Supabase tidak merinci aktivitas apa
  yang dihitung, jadi jangan diandalkan. Bila praktik **libur 5 hari atau lebih** (cuti, hari raya):
  - catat hari libur itu di Pengaturan (hari libur) supaya pasien tidak mendaftar;
  - setiap 3 sampai 4 hari selama libur: buka website, masuk ke panel staf, jalankan cadangan manual, lalu cek
    status project di dashboard;
  - bila tetap terjeda: **Restore project** di dashboard, tunggu sampai aktif, lalu uji ambil nomor dan login.

#### Dokter, setiap minggu

- [ ] Lihat Riwayat dan rekap minggu ini; angka masuk akal.
- [ ] Pengaturan masih benar; hari libur minggu depan sudah dicatat.

### A15. Risiko yang tersisa selama sebulan

| Risiko | Akibat | Pengurang risiko di panduan ini | Sisa risiko |
|---|---|---|---|
| Tidak ada cadangan otomatis Supabase Free | Data hilang bila project rusak atau terhapus | Cadangan harian Mac (A13), latihan pemulihan (A13.7) | Data sejak cadangan terakhir (hingga sekitar 1 hari) hilang; diisi ulang dari kertas |
| Project dijeda karena sepi | Website mati sampai project dipulihkan (beberapa menit) | Pemakaian harian, pemeriksaan A14, prosedur libur panjang | Kecil selama praktik buka rutin |
| Cadangan di satu Mac | Mac hilang atau rusak berarti cadangan ikut hilang; Mac dicuri berarti data pasien berisiko | FileVault, folder pribadi, tanpa sinkron awan, Time Machine terenkripsi atau dikecualikan | Bila Mac hilang: ganti kata sandi database produksi segera (data di Mac terenkripsi FileVault selama Mac terkunci) |
| File cadangan berisi hash kata sandi dan rahasia MFA staf | Bila bocor, kata sandi lemah bisa ditebak secara luring | Kebijakan kata sandi 12 karakter; penyimpanan seperti kunci rahasia | Bila file diduga bocor: ganti kata sandi semua staf dan reset MFA |
| Data yang dihapus atas permintaan pasien masih ada di cadangan Mac | Penghapusan baru tuntas setelah cadangan lama terhapus (sekitar 14 hari) | Rotasi 14 cadangan; disebut di Kebijakan Privasi (keputusan no. 4) | Sesuai teks privasi |
| Vercel Hobby untuk praktik (komersial) | Melanggar ketentuan Hobby; akun bisa dibatasi; melewati batas pemakaian menghentikan fitur sampai 30 hari | Uji coba satu bulan, belum ada poster/QR, pemantauan Usage mingguan | Kecil tetapi nyata; upgrade tepat waktu |
| Log Vercel hanya 1 jam | Penyebab galat sulit dilacak | Cek log segera setelah praktik tutup; catatan masalah perawat | Sebagian galat tidak bisa dijelaskan |
| *Leaked password protection* kemungkinan belum tersedia | Kata sandi yang pernah bocor di internet tidak ditolak | Kebijakan kata sandi, batas percobaan, MFA sukarela | Bergantung pada disiplin staf |
| Tanpa SLA dan dukungan berbayar | Gangguan platform tidak bisa dieskalasi | Antrean kertas sebagai cadangan | Diterima selama uji coba |
| Batas 2 project aktif di Free | Latihan atau pemulihan sungguhan perlu menjeda dev | Langkah A13.7 | Diterima |

**Pemicu upgrade lebih cepat** (jangan menunggu satu bulan):

- project produksi pernah terjeda saat dibutuhkan;
- cadangan harian gagal dua malam berturut-turut dan belum bisa diperbaiki;
- latihan pemulihan A13.7 gagal;
- pemakaian Supabase atau Vercel melewati setengah batas paket gratis;
- ada pemberitahuan dari Vercel soal penggunaan komersial;
- jumlah pasien yang memakai website sudah besar sehingga kehilangan data satu hari tidak bisa diterima.

**Pemeriksaan akhir bagian A:** semua butir A1 sampai A11 tercentang, cadangan harian berjalan dan latihan pemulihan
lulus, uji coba berjalan, dan dr. Dhena setuju lanjut.

---

## B. Peluncuran berbayar (Supabase Pro + Vercel Pro)

Urutan ini tidak memindahkan data: project Supabase dan project Vercel yang sama di-upgrade, jadi antrean uji coba
dan akun staf tetap ada.

### B0. Daftar periksa hari upgrade

Kerjakan setelah praktik tutup atau pada hari libur, dalam satu sesi. Rincian setiap langkah ada di B2 sampai B5.

Sebelum upgrade:

- [ ] Rapat akhir uji coba selesai dan dr. Dhena setuju (A12, minggu 4).
- [ ] Jalankan cadangan manual terakhir dan pastikan `Selesai:` muncul:

  ```bash
  ~/CadanganPraktikTHT/cadangkan.sh
  ```

- [ ] Kartu pembayaran siap; batas belanja ditentukan.

Supabase:

- [ ] Organisasi produksi diupgrade ke **Pro** (B2). Project, data, kunci API, dan akun staf tetap sama; tidak ada
  yang perlu diubah di Vercel.
- [ ] *Spend Cap* aktif. Ukuran komputasi tetap bawaan (Micro, tertutup kredit).
- [ ] *Leaked password protection* aktif (Authentication, Password).
- [ ] Hari berikutnya: **Database, Backups** menampilkan cadangan harian pertama. Catat masa simpannya.
- [ ] Uji ambil nomor dan login staf setelah upgrade.

Vercel:

- [ ] Tim Pro dibuat dan project ditransfer (B3). Setelah transfer, cek: variabel lingkungan Production dan Preview
  lengkap, *Function Region* **sin1**, *Node.js Version* 22.x, Deployment Protection untuk Preview.
- [ ] **Redeploy** produksi, lalu ulangi pemeriksaan A10 (fungsi, `x-vercel-id` memuat `sin1`, header keamanan).
- [ ] *Spend Management* diatur.

Cadangan Mac setelah Supabase Pro berjalan (pilih satu, setelah cadangan Supabase pertama terlihat):

- [ ] **Saran: lanjutkan seminggu sekali** sebagai salinan di luar Supabase (cadangan Supabase Pro ikut hilang bila
  project terhapus). Ubah `SIMPAN=14` menjadi `SIMPAN=4` di `cadangkan.sh`, lalu ubah jadwal ke hari Minggu: di file
  `~/Library/LaunchAgents/id.praktik-tht.cadangan.plist`, tambahkan `<key>Weekday</key><integer>0</integer>` di dalam
  `StartCalendarInterval`, lalu jalankan `launchctl bootout` dan `launchctl bootstrap` lagi (A13.6). Sebutkan
  "salinan mingguan, disimpan sekitar satu bulan" di Kebijakan Privasi.
- [ ] **Atau hentikan:** `launchctl bootout` (A13.6), hapus file plist, hapus folder `~/CadanganPraktikTHT/cadangan`,
  dan hapus item Keychain:

  ```bash
  security delete-generic-password -s praktik-tht-produksi-db
  ```

  Perbarui Kebijakan Privasi (tidak ada lagi salinan di komputer pengelola).

Setelah upgrade:

- [ ] Kebijakan Privasi diperbarui lewat pull request: masa simpan cadangan Supabase, salinan Mac (bila lanjut),
  hosting yang dipakai.
- [ ] `docs/tinjauan-keamanan.md`: catat tanggal upgrade, cadangan Supabase aktif, leaked password protection aktif.
- [ ] Daftar periksa harian pemilik (A14) diringankan: cadangan harian Mac tidak wajib lagi; cek status project
  tidak perlu lagi (Pro tidak dijeda). Pemeriksaan mingguan tetap.
- [ ] Domain sendiri (B4) dan persiapan pengumuman (B5).

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
- [ ] Cadangan Mac: lanjut mingguan atau dihentikan (B0).

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
4. A10 pemeriksaan, A11 kunci dan pembersihan, A13 cadangan pertama dan jadwal otomatis.
5. A12 uji coba satu bulan dengan A14 setiap hari dan minggu; latihan pemulihan A13.7 di minggu pertama; pantau
   pemicu upgrade di A15.
6. Setelah disetujui: B0 hari upgrade (B2 Supabase Pro, B3 Vercel Pro atau bagian D), B4 domain, B5 sebelum
   diumumkan.

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
