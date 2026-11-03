import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Kerangka layar pasien: lebar 390 px, tombol bawah menempel di dasar layar. */
export function PatientPage({
  children,
  footer,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto flex min-h-dvh w-full max-w-[390px] flex-col px-6 pt-6 pb-6", className)}>
      <div className="flex-1">{children}</div>
      {footer ? <div className="mt-10">{footer}</div> : null}
    </main>
  );
}

export function Brand() {
  return <p className="pt-2 text-base font-semibold">Praktik THT</p>;
}

export function BackLink({ href, label = "Kembali" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="-ml-2 inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-tint"
    >
      <ChevronIcon direction="left" className="size-6" />
    </Link>
  );
}

export function PageTitle({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="mt-4">
      <h1 className="text-[32px] leading-tight font-medium tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-2 text-base text-muted">{subtitle}</p> : null}
    </header>
  );
}

export function ChevronIcon({ direction, className }: { direction: "left" | "right"; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tombol berbentuk link, gaya sama dengan Button size lg. */
export function LinkButton({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: "primary" | "outline";
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-[53px] w-full items-center justify-center rounded-box px-6 text-base font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        variant === "primary"
          ? "bg-primary text-white hover:bg-primary/90"
          : "border border-box-line bg-white text-ink hover:bg-tint",
      )}
    >
      {children}
    </Link>
  );
}
