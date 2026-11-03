import { Brand, LinkButton, PageTitle, PatientPage } from "@/components/patient/page-shell";

export default function QueueNotFound() {
  return (
    <PatientPage footer={<LinkButton href="/">Kembali ke beranda</LinkButton>}>
      <Brand />
      <PageTitle
        title="Nomor antrean tidak ditemukan"
        subtitle="Tautan ini tidak dikenal atau sudah tidak berlaku. Ambil nomor baru dari beranda, ya."
      />
    </PatientPage>
  );
}
