import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

const LOGIN_PATH = "/staf/masuk";

/**
 * Sesi staf untuk /staf/*: menyegarkan token Supabase (cookie) sebelum halaman
 * dirender, lalu mengalihkan tamu ke halaman masuk. Ini hanya pemeriksaan awal.
 * Peran diperiksa lagi di setiap halaman dan Server Action (requireStaff) dan
 * oleh RLS di database.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = publicEnv();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // getUser memvalidasi token ke server Auth dan menyegarkannya bila perlu.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = request.nextUrl.pathname === LOGIN_PATH;

  if (!user && !isLogin) {
    return redirectKeepingCookies(request, response, LOGIN_PATH);
  }
  if (user && isLogin) {
    return redirectKeepingCookies(request, response, "/staf");
  }
  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ["/staf", "/staf/:path*"],
};
