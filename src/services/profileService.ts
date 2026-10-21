import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProfileRow,
  ProfileInsert,
  ProfileUpdate,
} from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/**
 * Fetch a single profile by user ID.
 * Returns null if the profile doesn't exist yet.
 */
export async function getProfile(
  supabase: Client,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data ?? null) as ProfileRow | null;
}

/**
 * Upsert a profile row.
 * Called on first sign-in via the auth trigger, and when the user
 * edits their display name / avatar.
 */
export async function upsertProfile(
  supabase: Client,
  profile: ProfileInsert
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

/**
 * Update mutable profile fields (username, avatar_url).
 */
export async function updateProfile(
  supabase: Client,
  userId: string,
  updates: ProfileUpdate
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

