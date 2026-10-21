import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types";

/**
 * Browser-side Supabase client.
 *
 * Use this in Client Components ("use client").
 * It re-uses a single instance per browser tab via module-level caching,
 * so it's safe to call at the top of any component file.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
