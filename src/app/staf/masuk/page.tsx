import { Suspense } from "react";
import { StaffBrand } from "@/components/staff/brand";
import { LoginForm } from "./login-form";

const NOTICES: Record<string, string> = {
  peran: "Akun ini belum diberi peran staf atau sudah dinonaktifkan. Hubungi pemilik praktik.",
  keluar: "Anda sudah keluar.",
  pemulihan: "Perangkat lama sudah dilepas. Masuk lagi, lalu pasang verifikasi dua langkah di ponsel baru.",
  "mfa-mati": "Verifikasi dua langkah sudah dimatikan. Silakan masuk lagi.",
};

export default function MasukPage({ searchParams }: PageProps<"/staf/masuk">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] rounded-box border border-staff-line bg-white p-7">
        <StaffBrand label="Praktik THT, panel staf" />
        <h1 className="mt-6 text-[32px] leading-tight font-semibold">Masuk</h1>
        <p className="mt-3 text-muted">Untuk dokter, perawat, dan pemilik. Pasien tidak perlu masuk.</p>
        <Suspense fallback={null}>
          <Notice searchParams={searchParams} />
        </Suspense>
        <LoginForm />
      </div>
    </main>
  );
}

async function Notice({ searchParams }: { searchParams: PageProps<"/staf/masuk">["searchParams"] }) {
  const { galat, info } = await searchParams;
  const key = typeof galat === "string" ? galat : typeof info === "string" ? info : undefined;
  const notice = key ? NOTICES[key] : undefined;
  if (!notice) return null;
  return (
    <p role="status" className="mt-4 rounded-xl bg-tint px-4 py-3 text-sm">
      {notice}
    </p>
  );
}
