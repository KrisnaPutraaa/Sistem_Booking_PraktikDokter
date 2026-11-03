import type { Metadata } from "next";

// Halaman nomor pasien tidak boleh muncul di mesin pencari. Header X-Robots-Tag
// dan Cache-Control: no-store dipasang di next.config.ts.
export const metadata: Metadata = {
  title: "Nomor antrean · Praktik THT",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AntreanLayout({ children }: LayoutProps<"/antrean">) {
  return children;
}
