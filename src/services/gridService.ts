import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CustomGridRow,
  CustomGridInsert,
  CustomGridUpdate,
} from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/** Fetch all public custom grids, ordered by play count. */
export async function getPublicGrids(
  supabase: Client
): Promise<CustomGridRow[]> {
  const { data, error } = await supabase
    .from("custom_grids")
    .select("*")
    .eq("is_public", true)
    .order("play_count", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CustomGridRow[];
}

/** Fetch all grids authored by the current user. */
export async function getMyGrids(
  supabase: Client,
  userId: string
): Promise<CustomGridRow[]> {
  const { data, error } = await supabase
    .from("custom_grids")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CustomGridRow[];
}

/** Fetch a single grid by ID. */
export async function getGridById(
  supabase: Client,
  gridId: string
): Promise<CustomGridRow | null> {
  const { data, error } = await supabase
    .from("custom_grids")
    .select("*")
    .eq("id", gridId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data ?? null) as CustomGridRow | null;
}

/** Create a new custom grid. */
export async function createGrid(
  supabase: Client,
  grid: CustomGridInsert
): Promise<CustomGridRow> {
  const { data, error } = await supabase
    .from("custom_grids")
    .insert(grid)
    .select()
    .single();

  if (error) throw error;
  return data as CustomGridRow;
}

/** Update an existing grid (author only — enforced by RLS). */
export async function updateGrid(
  supabase: Client,
  gridId: string,
  updates: CustomGridUpdate
): Promise<CustomGridRow> {
  const { data, error } = await supabase
    .from("custom_grids")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", gridId)
    .select()
    .single();

  if (error) throw error;
  return data as CustomGridRow;
}

/** Increment play_count atomically via a Supabase RPC. */
export async function incrementPlayCount(
  supabase: Client,
  gridId: string
): Promise<void> {
  const { error } = await supabase.rpc("increment_grid_play_count", {
    grid_id: gridId,
  });
  if (error) throw error;
}

/** Delete a custom grid (author only — enforced by RLS). */
export async function deleteGrid(
  supabase: Client,
  gridId: string
): Promise<void> {
  const { error } = await supabase
    .from("custom_grids")
    .delete()
    .eq("id", gridId);

  if (error) throw error;
}


