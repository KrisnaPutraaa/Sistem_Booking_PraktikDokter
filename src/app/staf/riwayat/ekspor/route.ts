import { buildExportCsv } from "@/lib/staff/export-csv";
import { exportFileName, parsePeriod } from "@/lib/staff/history";
import { getExportEntries } from "@/lib/staff/history-data";
import { canExportCsv } from "@/lib/staff/roles";
import { lookupStaff } from "@/lib/staff/session";
import { isCalendarDate, todayInAppZone } from "@/lib/time";

/**
 * Ekspor rekap CSV (dokter dan pemilik). Data dibaca dengan sesi staf sendiri
 * (RLS). Isi berkas tidak pernah dicatat di log.
 */
export async function GET(request: Request): Promise<Response> {
  const lookup = await lookupStaff();
  if (lookup.kind === "anonymous") return plain(401, "Masuk dulu sebagai staf.");
  if (lookup.kind === "no_profile") return plain(403, "Akun belum diberi peran.");
  const staff = lookup.staff;
  if (!canExportCsv(staff.role)) return plain(403, "Ekspor CSV hanya untuk dokter dan pemilik.");

  const url = new URL(request.url);
  const dari = url.searchParams.get("dari") ?? undefined;
  const sampai = url.searchParams.get("sampai") ?? undefined;
  const period = parsePeriod({ dari, sampai }, todayInAppZone());
  // Periode yang diminta tapi tidak valid ditolak, bukan diam-diam diganti bawaan.
  if (period.isDefault && (dari !== undefined || sampai !== undefined)) {
    const bothDates = dari !== undefined && sampai !== undefined && isCalendarDate(dari) && isCalendarDate(sampai);
    return plain(400, bothDates ? "Periode paling panjang 92 hari." : "Periode tidak valid.");
  }

  let csv: string;
  try {
    csv = buildExportCsv(await getExportEntries(staff, period));
  } catch (error) {
    console.error("ekspor CSV gagal", { message: error instanceof Error ? error.message : "unknown" });
    return plain(500, "Ekspor gagal. Coba lagi sebentar lagi.");
  }

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName(period)}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
