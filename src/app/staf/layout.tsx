import type { Metadata } from "next";

// Panel staf tidak boleh diindeks. Header X-Robots-Tag dan Cache-Control: no-store
// dipasang di next.config.ts.
export const metadata: Metadata = {
  title: "Panel staf · Praktik THT",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function StafLayout({ children }: LayoutProps<"/staf">) {
  return <div className="flex min-h-dvh flex-1 flex-col bg-staff-bg">{children}</div>;
}
