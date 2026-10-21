import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js middleware — runs on every matched request.
 * Responsibilities:
 *   1. Refresh the Supabase session cookie so Server Components always
 *      have a valid, non-expired session.
 *   2. Redirect unauthenticated users away from protected routes.
 *   3. Redirect authenticated users away from auth pages.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static  (static files)
     *   - _next/image   (image optimisation)
     *   - favicon.ico, sitemap.xml, robots.txt
     *   - Public assets (png, jpg, svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)$).*)",
  ],
};
