import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MatchHistoryRow,
  MatchHistoryInsert,
  MatchOutcome,
} from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/**
 * Persist a completed match to the history table.
 * Called at game_over before resetting the Zustand store.
 */
export async function saveMatch(
  supabase: Client,
  match: MatchHistoryInsert
): Promise<MatchHistoryRow> {
  const { data, error } = await supabase
    .from("match_history")
    .insert(match)
    .select()
    .single();

  if (error) throw error;
  return data as MatchHistoryRow;
}

/**
 * Fetch the N most recent matches for a player.
 * Used on the profile / history screen.
 */
export async function getRecentMatches(
  supabase: Client,
  playerId: string,
  limit = 20
): Promise<MatchHistoryRow[]> {
  const { data, error } = await supabase
    .from("match_history")
    .select("*")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as MatchHistoryRow[];
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number;
}

/**
 * Aggregate a player's record straight from match_history.
 * The profiles.wins/losses columns are not maintained by any trigger, so the
 * match log is the source of truth.
 */
export async function getPlayerStats(
  supabase: Client,
  playerId: string
): Promise<PlayerStats> {
  async function countOutcome(outcome?: MatchOutcome): Promise<number> {
    let query = supabase
      .from("match_history")
      .select("id", { count: "exact", head: true })
      .eq("player_id", playerId);

    if (outcome) query = query.eq("outcome", outcome);

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }

  const [wins, losses, draws] = await Promise.all([
    countOutcome("win"),
    countOutcome("loss"),
    countOutcome("draw"),
  ]);
  const total = wins + losses + draws;

  return {
    wins,
    losses,
    draws,
    total,
    winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
  };
}

/**
 * Fetch a single match by ID (RLS limits this to the caller's own matches).
 * Used by the replay viewer.
 */
export async function getMatchById(
  supabase: Client,
  matchId: string
): Promise<MatchHistoryRow | null> {
  const { data, error } = await supabase
    .from("match_history")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as MatchHistoryRow | null;
}

/**
 * Aggregate win-rate and average turns for the leaderboard.
 * Returns rows ordered by win_rate desc, then total games desc.
 */
export async function getLeaderboard(
  supabase: Client,
  limit = 50
): Promise<
  Array<{
    player_id: string;
    username: string;
    avatar_url: string | null;
    total_games: number;
    wins: number;
    losses: number;
    win_rate: number;
    avg_turns: number;
  }>
> {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as Awaited<ReturnType<typeof getLeaderboard>>;
}

