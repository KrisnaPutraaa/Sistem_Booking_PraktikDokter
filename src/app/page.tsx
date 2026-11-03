import { Button } from "@/components/ui/button";
import { BorderedBox, BoxSection } from "@/components/ui/bordered-box";
import { StatusBadge } from "@/components/ui/status-badge";
import { UnderlineInput } from "@/components/ui/underline-input";
import { QUEUE_STATUSES } from "@/lib/queue-status";

// Halaman sementara Fase 1: pratinjau komponen dasar. Diganti Beranda di Fase 3.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[390px] px-6 py-8">
      <p className="text-base font-semibold">Praktik THT</p>

      <section className="mt-10">
        <p className="text-accent">Dokter Spesialis THT-KL</p>
        <h1 className="mt-2 text-4xl leading-tight font-medium tracking-tight">
          dr. [Nama Dokter],
          <br />
          <span className="text-muted">Sp.THT-KL</span>
        </h1>
        <p className="mt-4 text-base text-muted">
          Pemeriksaan telinga, hidung, dan tenggorokan untuk anak dan dewasa.
        </p>
      </section>

      <BorderedBox className="mt-8">
        <BoxSection label="Jam praktik">
          <div className="flex justify-between">
            <span>Senin – Sabtu</span>
            <span>17.30 – 23.00</span>
          </div>
          <div className="mt-1 flex justify-between text-muted">
            <span>Minggu</span>
            <span>Tutup</span>
          </div>
        </BoxSection>
        <BoxSection label="Tempat">
          <p>[Nama klinik]</p>
          <p className="text-muted">[Alamat praktik]</p>
        </BoxSection>
        <BoxSection label="Kontak">
          <p>WhatsApp [nomor]</p>
        </BoxSection>
      </BorderedBox>

      <h2 className="mt-12 text-sm tracking-wide text-muted uppercase">Pilih hari</h2>
      <BorderedBox className="mt-2">
        <BoxSection>
          <p className="text-lg">Hari ini, Selasa 3 Nov</p>
          <p className="text-muted">12 antrean tersisa</p>
        </BoxSection>
        <BoxSection selected>
          <p className="text-lg">Rabu, 4 Nov</p>
          <p className="text-muted">8 antrean tersisa</p>
        </BoxSection>
      </BorderedBox>

      <BorderedBox className="mt-4">
        <UnderlineInput label="Nama pasien (wajib)" name="name" placeholder="Budi Santoso" />
        <UnderlineInput
          label="Nomor WhatsApp (wajib)"
          name="whatsapp"
          inputMode="tel"
          placeholder="0812 0000 0000"
        />
        <UnderlineInput label="Keluhan (opsional)" name="complaint" placeholder="Telinga kanan berdenging" />
      </BorderedBox>

      <h2 className="mt-12 text-sm tracking-wide text-muted uppercase">Nomor antrean</h2>
      <BorderedBox className="mt-2 text-center">
        <BoxSection label="Nomor antrean" className="py-6">
          <p className="text-8xl leading-none font-semibold text-accent">13</p>
          <p className="mt-4 text-lg font-medium">Rabu, 4 Nov 2026</p>
          <p className="text-muted">Perkiraan dipanggil sekitar pukul 20.30</p>
        </BoxSection>
      </BorderedBox>

      <h2 className="mt-12 text-sm tracking-wide text-muted uppercase">Penanda status</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {QUEUE_STATUSES.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>

      <h2 className="mt-12 text-sm tracking-wide text-muted uppercase">Tombol</h2>
      <div className="mt-2 space-y-3">
        <Button>Ambil nomor antrean</Button>
        <Button variant="outline">Kembali ke nomor saya</Button>
        <div className="flex gap-2">
          <Button size="sm">Panggil</Button>
          <Button size="sm" variant="soft">
            Selesai
          </Button>
          <Button size="sm" variant="soft">
            Ekspor rekap CSV
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Nomor antrean per hari. Jam pemeriksaan berupa perkiraan.
      </p>
    </main>
  );
}
