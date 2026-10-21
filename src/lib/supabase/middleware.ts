import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types";

/**
 * Supabase middleware utility.
 *
 * Refreshes the user's session on every request so Server Components
 * always receive a valid, non-expired session cookie.
 * Must be called from /src/middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) =>
        request.cookies.set(name, value)
      );
      supabaseResponse = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) =>
        supabaseResponse.cookies.set(name, value, options)
      );
    },
  };

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods }
  );

  // Refresh the session — do NOT remove this line.
  // It's required to keep the session alive.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect authenticated-only routes.
  // /game intentionally stays public: guests can play, their matches simply
  // aren't persisted (see store/persist.ts).
  // /auth/callback must run even for an existing session so the code exchange
  // (and its redirect) always completes. /auth/reset-password needs a recovery
  // session to actually set a new password, so it isn't a "guest only" page.
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/auth/callback") &&
    !request.nextUrl.pathname.startsWith("/auth/reset-password");
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/profile") ||
    request.nextUrl.pathname.startsWith("/leaderboard") ||
    request.nextUrl.pathname.startsWith("/grids/new") ||
    request.nextUrl.pathname.startsWith("/grids/edit");

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If already logged in, don't show auth pages.
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}
