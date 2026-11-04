import { describe, expect, it } from "vitest";
import { buildWhatsappLink } from "./whatsapp-message";

const base = {
  whatsapp: "6281234567890",
  number: 13,
  estTime: "20:30:00",
  clinicName: null,
  doctorName: "dr. Luh Putu Dhena Purwaningsih, Sp.THT-KL",
};

function textOf(link: string): string {
  const url = new URL(link);
  return url.searchParams.get("text") ?? "";
}

describe("buildWhatsappLink", () => {
  it("pesan menunggu berisi nomor dan perkiraan jam", () => {
    const link = buildWhatsappLink({ ...base, status: "waiting" });
    expect(link.startsWith("https://wa.me/6281234567890?text=")).toBe(true);
    expect(textOf(link)).toBe(
      "Halo, ini praktik dr. Luh Putu Dhena Purwaningsih. Nomor antrean Anda 13, perkiraan dipanggil sekitar 20.30.",
    );
  });

  it("pesan dipanggil dan nama klinik bila diisi", () => {
    const link = buildWhatsappLink({ ...base, status: "in_progress", clinicName: "Klinik THT Kediri" });
    expect(textOf(link)).toBe(
      "Halo, ini Klinik THT Kediri. Nomor antrean Anda 13 sedang dipanggil. Silakan menuju ruang periksa.",
    );
  });
});
