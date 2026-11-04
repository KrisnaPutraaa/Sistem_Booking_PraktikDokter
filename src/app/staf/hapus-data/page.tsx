import { connection } from "next/server";
import { Suspense } from "react";
import { StaffCard } from "@/components/staff/card";
import { EraseDataCard } from "@/components/staff/erase-data-card";
import { StaffHeader, StaffTabs } from "@/components/staff/staff-header";
import { canErasePatientData } from "@/lib/staff/roles";
import { requireStaff } from "@/lib/staff/session";

export default function HapusDataPage() {
  return (
    <Suspense fallback={<EraseSkeleton />}>
      <Erase />
    </Suspense>
  );
}

async function Erase() {
  await connection();
  const staff = await requireStaff();

  return (
    <main className="mx-auto w-full max-w-[1330px] px-4 py-6 sm:px-6">
      <StaffHeader staff={staff} />
      <div className="mt-6">
        <StaffTabs role={staff.role} active="erase" />
      </div>
      {canErasePatientData(staff.role) ? (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <EraseDataCard />
          <StaffCard>
            <h2 className="text-xl font-semibold">Prosedur</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
              <li>
                Permintaan datang lewat WhatsApp praktik atau langsung di praktik. Pastikan yang meminta adalah pasien
                sendiri atau orang tua/wali: cocokkan nama dan nomor WhatsApp, dan minta pasien mengirim pesan dari
                nomor itu.
              </li>
              <li>Cari nomor WhatsApp, periksa daftar antrean bersama pasien, pilih yang diminta.</li>
              <li>
                Hapus. Nama, WhatsApp, dan keluhan hilang dari database; tautan nomor antrean pasien tidak berlaku lagi.
              </li>
              <li>Kabari pasien bahwa datanya sudah dihapus. Jangan menyimpan salinan permintaan berisi data pasien.</li>
            </ol>
            <p className="mt-4 text-sm text-muted">
              Yang tidak ikut terhapus dari sini: riwayat chat WhatsApp di ponsel praktik, file CSV yang pernah diekspor,
              dan cadangan otomatis database (terhapus sendiri sesuai masa simpan cadangan). Rincian di
              docs/prosedur-hapus-data.md.
            </p>
          </StaffCard>
        </div>
      ) : (
        <StaffCard className="mt-6">
          <p>Hapus data pasien hanya bisa dilakukan pemilik.</p>
        </StaffCard>
      )}
    </main>
  );
}

function EraseSkeleton() {
  return (
    <main aria-busy="true" aria-label="Memuat" className="mx-auto w-full max-w-[1330px] animate-pulse px-6 py-6">
      <div className="h-8 w-64 rounded bg-staff-line" />
      <div className="mt-6 h-96 rounded-box bg-staff-line" />
    </main>
  );
}
