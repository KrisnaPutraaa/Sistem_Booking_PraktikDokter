import { NextResponse, type NextRequest } from "next/server";
import { createStaffClient } from "@/lib/supabase/server";

/**
 * Mengeluarkan akun yang login tanpa profil staf (dialihkan requireStaff).
 * Tombol Keluar biasa memakai Server Action signOutAction.
 */
export async function GET(request: NextRequest) {
  const supabase = await createStaffClient();
  await supabase.auth.signOut();
  const url = request.nextUrl.clone();
  url.pathname = "/staf/masuk";
  url.search = request.nextUrl.searchParams.get("alasan") === "peran" ? "?galat=peran" : "?info=keluar";
  return NextResponse.redirect(url);
}
