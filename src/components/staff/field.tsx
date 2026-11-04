import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const base =
  "w-full rounded-xl border border-staff-line bg-staff-bg px-4 text-base text-ink placeholder:text-muted " +
  "focus-visible:border-primary focus-visible:outline-none aria-invalid:border-noshow-fg";

export function StaffInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-12", className)} {...props} />;
}

export function StaffTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-20 py-3", className)} {...props} />;
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-noshow-fg">
      {message}
    </p>
  );
}
