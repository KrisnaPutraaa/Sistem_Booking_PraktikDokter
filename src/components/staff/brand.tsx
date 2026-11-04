export function StaffBrand({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="size-7 rounded-full bg-primary" />
      <span className="text-lg font-semibold">{label}</span>
    </div>
  );
}
