import { formatClock, splitDoctorName } from "@/lib/format";
import type { QueueStatus } from "@/lib/queue-status";

/**
 * Tautan wa.me dengan pesan siap kirim (docs/Panduan, bagian 7). Isinya hanya
 * nomor antrean dan perkiraan jam; keluhan tidak pernah ikut.
 */
export function buildWhatsappLink(opts: {
  whatsapp: string;
  number: number;
  status: QueueStatus;
  estTime: string;
  clinicName: string | null;
  doctorName: string;
}): string {
  const practice = opts.clinicName?.trim() || `praktik ${splitDoctorName(opts.doctorName).name.replace(/,$/, "")}`;
  const text =
    opts.status === "in_progress"
      ? `Halo, ini ${practice}. Nomor antrean Anda ${opts.number} sedang dipanggil. Silakan menuju ruang periksa.`
      : `Halo, ini ${practice}. Nomor antrean Anda ${opts.number}, perkiraan dipanggil sekitar ${formatClock(opts.estTime)}.`;
  return `https://wa.me/${encodeURIComponent(opts.whatsapp)}?text=${encodeURIComponent(text)}`;
}
