// Barrel — import Supabase clients from "@/lib/supabase"
export { createClient as createBrowserSupabaseClient } from "./client";
export { createClient as createServerSupabaseClient } from "./server";
export { updateSession } from "./middleware";
