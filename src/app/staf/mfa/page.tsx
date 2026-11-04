import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOutAction } from "@/app/staf/actions";
import { StaffBrand } from "@/components/staff/brand";
import { Button } from "@/components/ui/button";
import { lookupStaff } from "@/lib/staff/session";
import { MfaFlow, type MfaMode } from "./mfa-flow";

/**
 * Verifikasi dua langkah: pasang perangkat (opsional; wajib hanya bila saklar
 * mfa_wajib menyala untuk dokter dan pemilik) atau masukkan kode saat masuk. Halaman ini tidak
 * mengalihkan staf yang sudah aal2, supaya kode pemulihan yang baru dibuat
 * tetap tampil setelah sesi diperbarui.
 */
export default function MfaPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px] rounded-box border border-staff-line bg-white p-7">
        <StaffBrand label="Praktik THT, panel staf" />
        <div className="mt-6">
          <Suspense fallback={<p className="text-muted">Memuat…</p>}>
            <Flow />
          </Suspense>
        </div>
        <form action={signOutAction} className="mt-8 border-t border-staff-line pt-4">
          <Button type="submit" variant="soft" size="sm">
            Keluar
          </Button>
        </form>
      </div>
    </main>
  );
}

async function Flow() {
  await connection();
  const result = await lookupStaff();
  if (result.kind === "anonymous") redirect("/staf/masuk");
  if (result.kind === "no_profile") redirect("/staf/keluar?alasan=peran");

  let mode: MfaMode;
  if (result.kind === "mfa") {
    mode = result.step === "verify" ? "verify" : "enroll-required";
  } else {
    mode = result.staff.verifiedFactorIds.length === 0 ? "enroll-optional" : "done";
  }
  return <MfaFlow mode={mode} />;
}
