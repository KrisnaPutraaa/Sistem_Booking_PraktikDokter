import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function StaffCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-box border border-staff-line bg-white p-6", className)}>{children}</section>;
}
