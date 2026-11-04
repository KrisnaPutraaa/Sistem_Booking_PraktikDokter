import Link from "next/link";
import { signOutAction } from "@/app/staf/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { canEditSettings, canErasePatientData, ROLE_LABEL, type StaffRole } from "@/lib/staff/roles";
import type { StaffSession } from "@/lib/staff/session";
import { StaffBrand } from "./brand";

export function StaffHeader({ staff }: { staff: Pick<StaffSession, "role" | "fullName"> }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <StaffBrand label="Praktik THT, panel admin" />
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted">
          Masuk sebagai {ROLE_LABEL[staff.role]} · {staff.fullName}
        </p>
        <form action={signOutAction}>
          <Button type="submit" variant="soft" size="sm">
            Keluar
          </Button>
        </form>
      </div>
    </header>
  );
}

export type StaffTab = "today" | "history" | "settings" | "account" | "erase";

type TabHref = "/staf" | "/staf/riwayat" | "/staf/pengaturan" | "/staf/akun" | "/staf/hapus-data";

/** Tab panel staf. Pengaturan untuk dokter dan pemilik; hapus data pasien hanya pemilik. */
export function StaffTabs({ role, active }: { role: StaffRole; active: StaffTab }) {
  const tabs: { key: StaffTab; href: TabHref; label: string }[] = [
    { key: "today", href: "/staf", label: "Antrean hari ini" },
    { key: "history", href: "/staf/riwayat", label: "Riwayat dan rekap" },
  ];
  if (canEditSettings(role)) tabs.push({ key: "settings", href: "/staf/pengaturan", label: "Pengaturan" });
  if (canErasePatientData(role)) tabs.push({ key: "erase", href: "/staf/hapus-data", label: "Hapus data pasien" });
  tabs.push({ key: "account", href: "/staf/akun", label: "Akun" });

  return (
    <nav aria-label="Bagian panel" className="flex flex-wrap gap-3">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "inline-flex h-10 items-center rounded-lg px-4",
            tab.key === active ? "bg-primary text-white" : "border border-staff-line bg-white hover:bg-tint",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
