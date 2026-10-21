import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types";

/**
 * Server-side Supabase client.
 *
 * Use this in Server Components, Server Actions, and Route Handlers.
 * Reads the session from the Next.js cookie store — never exposes the
 * service role key to the browser.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        // setAll is called from a Server Component — cookies can only
        // be mutated from a Server Action or Route Handler, so we
        // swallow this safely. The middleware keeps auth fresh.
      }
    },
  };

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods }
  );
}
