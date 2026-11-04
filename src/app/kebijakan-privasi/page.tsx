import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { BackLink, Brand, PatientPage } from "@/components/patient/page-shell";
import { getPracticeInfo } from "@/lib/patient/data";
import { formatWhatsappDisplay } from "@/lib/whatsapp";

/*
 * DRAF SEMENTARA (Fase 6, 4 November 2026).
 * Naskah final menunggu tinjauan dokter dan pihak yang memahami aturan
 * perlindungan data pribadi (UU No. 27 Tahun 2022 tentang PDP). Naskah ini
 * sengaja TIDAK mengklaim patuh pada aturan mana pun. Lihat
 * docs/catatan-fase-2.md bagian "Dari Fase 6" untuk hal yang perlu ditinjau.
 * Ubah DRAFT_UPDATED dan hapus kotak "Draf" setelah naskah disetujui.
 */
const DRAFT_UPDATED = "4 November 2026";

export const metadata: Metadata = {
  title: "Kebijakan Privasi · Praktik THT",
  description: "Data apa yang dicatat saat mengambil nomor antrean, untuk apa, dan cara meminta penghapusan.",
};

export default function KebijakanPrivasiPage() {
  return (
    <PatientPage>
      <div className="flex items-center gap-2">
        <BackLink href="/" />
        <Brand />
      </div>

      <header className="mt-4">
        <h1 className="text-[32px] leading-tight font-medium tracking-tight">Kebijakan Privasi</h1>
        <p className="mt-2 text-sm text-muted">Diperbarui {DRAFT_UPDATED}</p>
      </header>

      <p role="note" className="mt-5 rounded-box bg-tint px-4 py-3 text-sm">
        <strong>Draf.</strong> Naskah ini masih ditinjau dokter dan pihak yang memahami aturan perlindungan data
        pribadi, sehingga isinya bisa berubah.
      </p>

      <Suspense fallback={<div className="mt-8 h-40 animate-pulse rounded-box bg-line" />}>
        <PolicyBody />
      </Suspense>
    </PatientPage>
  );
}

async function PolicyBody() {
  const info = await getPracticeInfo();
  const practiceName = info.clinicName ? `${info.clinicName} (${info.doctorName})` : `praktik ${info.doctorName}`;
  const wa = info.whatsapp ? formatWhatsappDisplay(info.whatsapp) : null;

  return (
    <div className="mt-6 space-y-7 text-base leading-relaxed">
      <Section title="Siapa kami">
        <p>
          Website antrean ini dikelola oleh {practiceName}
          {info.address ? `, ${info.address}` : ""}. Website ini hanya untuk mengambil nomor antrean. Website ini bukan
          rekam medis.
        </p>
      </Section>

      <Section title="Data yang kami catat">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Yang Anda isi:</strong> nama pasien, nomor WhatsApp, dan keluhan (boleh dikosongkan). Keluhan
            termasuk informasi kesehatan, jadi cukup tulis seperlunya.
          </li>
          <li>
            <strong>Yang dicatat sistem:</strong> waktu Anda menyetujui kebijakan ini, tanggal dan nomor antrean,
            status (menunggu, diperiksa, selesai, tidak hadir), jam dipanggil dan selesai, serta tarif bila diisi staf.
          </li>
          <li>
            <strong>Data teknis:</strong> tautan nomor antrean disimpan di perangkat Anda (penyimpanan browser) agar
            Anda bisa kembali ke nomor Anda. Untuk mencegah penyalahgunaan, alamat IP dihitung dalam bentuk
            tersamarkan dan dibuang setelah paling lama 2 hari. Verifikasi keamanan Cloudflare Turnstile memeriksa
            browser Anda untuk membedakan manusia dan robot.
          </li>
        </ul>
        <p className="mt-3">Kami tidak meminta NIK, alamat rumah, atau hasil pemeriksaan.</p>
      </Section>

      <Section title="Untuk apa data dipakai">
        <ul className="list-disc space-y-2 pl-5">
          <li>Mengatur urutan antrean dan memperkirakan jam Anda dipanggil.</li>
          <li>Menghubungi Anda lewat WhatsApp tentang antrean, misalnya giliran Anda atau perubahan jadwal praktik.</li>
          <li>Rekap jumlah pasien per hari untuk keperluan praktik.</li>
          <li>Menjaga keamanan website.</li>
        </ul>
        <p className="mt-3">Data tidak dijual dan tidak dipakai untuk iklan.</p>
      </Section>

      <Section title="Siapa yang bisa melihat">
        <p>
          Perawat, dokter, dan pengelola teknis praktik. Masing-masing memakai akun sendiri, dan perubahan data
          tercatat. Halaman nomor antrean Anda tidak menampilkan nama pasien lain.
        </p>
        <p className="mt-3">Layanan pihak lain yang dipakai untuk menjalankan website ini:</p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>Supabase: database, dengan server di Singapura.</li>
          <li>Vercel: tempat website berjalan.</li>
          <li>Cloudflare Turnstile: verifikasi keamanan pada formulir.</li>
          <li>WhatsApp: bila staf mengirim pesan kepada Anda.</li>
        </ul>
        <p className="mt-3">Data tidak diberikan kepada pihak lain, kecuali bila diwajibkan hukum.</p>
      </Section>

      <Section title="Berapa lama disimpan">
        <p>
          Data disimpan sampai Anda meminta untuk dihapus. Praktik juga bisa memutuskan untuk menghapus identitas
          pasien secara otomatis setelah jangka waktu tertentu. Bila itu berlaku, halaman ini akan diperbarui.
        </p>
        <p className="mt-3">
          Cadangan otomatis database ikut terhapus dengan sendirinya dalam beberapa hari setelah data Anda dihapus.
        </p>
      </Section>

      <Section title="Meminta data dihapus">
        <p>
          Anda bisa meminta data Anda dihapus, dilihat, atau diperbaiki dengan menghubungi praktik
          {wa ? (
            <>
              {" "}
              lewat WhatsApp <strong className="whitespace-nowrap">{wa}</strong>
            </>
          ) : null}{" "}
          atau datang langsung ke praktik. Sebutkan nama dan nomor WhatsApp yang dipakai saat mendaftar. Agar data
          orang lain tidak terhapus, kami bisa meminta Anda mengirim pesan dari nomor WhatsApp tersebut.
        </p>
        <p className="mt-3">
          Setelah dihapus, nama, nomor WhatsApp, dan keluhan Anda hilang dari sistem antrean, dan tautan nomor antrean
          Anda tidak bisa dibuka lagi. Nomor antrean dan tanggalnya tetap disimpan tanpa identitas untuk menghitung
          jumlah pasien. Antrean yang masih berjalan hari ini diselesaikan dulu sebelum dihapus.
        </p>
        <p className="mt-3 text-sm text-muted">
          Pesan WhatsApp yang pernah dikirim ke atau dari ponsel praktik berada di aplikasi WhatsApp, terpisah dari
          sistem ini.
        </p>
      </Section>

      <Section title="Keamanan">
        <p>
          Koneksi ke website ini terenkripsi (HTTPS). Akses staf dibatasi sesuai peran, akun dokter dan pengelola
          memakai verifikasi dua langkah, dan perubahan data tercatat.
        </p>
      </Section>

      <Section title="Pasien anak">
        <p>Untuk pasien anak, orang tua atau wali yang mengisi formulir dan memberikan persetujuan.</p>
      </Section>

      <Section title="Perubahan kebijakan">
        <p>Bila kebijakan ini berubah, tanggal di bagian atas halaman ini ikut diperbarui.</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-medium">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
