import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "soft";
type Size = "lg" | "sm";

const variants: Record<Variant, string> = {
  // Tombol utama layar pasien, mis. "Ambil nomor antrean"
  primary: "bg-primary text-white hover:bg-primary/90",
  // Tombol garis, mis. "Kembali ke nomor saya"
  outline: "border border-box-line bg-white text-ink hover:bg-tint",
  // Tombol lembut panel staf, mis. "Selesai", "Ekspor rekap CSV"
  soft: "bg-soft text-ink hover:bg-soft/70",
};

const sizes: Record<Size, string> = {
  lg: "h-[53px] w-full rounded-box px-6 text-base",
  sm: "h-10 rounded-lg px-4 text-sm",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "lg",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
