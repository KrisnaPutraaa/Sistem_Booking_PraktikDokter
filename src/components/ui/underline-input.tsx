import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

/**
 * Kolom isian bergaris bawah (Pilih hari: Nama pasien / Nomor WhatsApp / Keluhan).
 * Dipakai di dalam BorderedBox; garis bawah isian terakhir hilang otomatis.
 */
export function UnderlineInput({ label, error, id, className, ...props }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div
      className={cn(
        "border-b border-line px-[18px] pt-3.5 pb-3 last:border-b-0",
        "focus-within:bg-tint",
        className,
      )}
    >
      <label htmlFor={inputId} className="block text-xs tracking-wide text-muted uppercase">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="mt-1 block w-full bg-transparent text-base text-ink outline-none placeholder:text-muted/60"
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-noshow-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
