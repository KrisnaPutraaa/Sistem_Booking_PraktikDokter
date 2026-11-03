import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Kotak bergaris dengan pemisah antarbagian (Beranda: Jam praktik / Tempat / Kontak).
 * Setiap anak langsung dipisah garis tipis.
 */
export function BorderedBox({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "divide-y divide-line overflow-hidden rounded-box border border-box-line bg-page",
        className,
      )}
      {...props}
    />
  );
}

type SectionProps = HTMLAttributes<HTMLDivElement> & {
  /** Label kecil berhuruf kapital, mis. "JAM PRAKTIK". */
  label?: ReactNode;
  selected?: boolean;
};

export function BoxSection({ label, selected, className, children, ...props }: SectionProps) {
  return (
    <div className={cn("px-[18px] py-4", selected && "bg-tint", className)} {...props}>
      {label ? (
        <p className="mb-1.5 text-xs tracking-wide text-muted uppercase">{label}</p>
      ) : null}
      {children}
    </div>
  );
}
