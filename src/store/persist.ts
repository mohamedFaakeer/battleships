import type { GameState, MatchHistoryInsert, Json } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { saveMatch } from "@/services/matchService";
import { buildReplayPayload } from "@/lib/replay";
import { isUuid } from "@/lib/grids";

/**
 * Persist a completed match to Supabase.
 * Called automatically when phase transitions to game_over.
 */
export async function persistMatch(state: GameState): Promise<void> {
  // Skip persistence for guest users (no auth.uid())
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.info("Guest mode — match not persisted to database");
    return;
  }

  if (state.phase !== "game_over" || !state.endedAt || !state.winner) {
    console.warn("persistMatch called but game is not over");
    return;
  }

  const outcome = state.winner === "player" ? "win" : "loss";
  const duration = state.endedAt
    ? Math.floor(
        (new Date(state.endedAt).getTime() -
          (state.attackHistory[0]?.timestamp
            ? new Date(state.attackHistory[0].timestamp).getTime()
            : Date.now())) /
          1000
      )
    : null;

  // Calculate hit/miss counts
  const playerAttacks = state.attackHistory.filter((a) => a.attackerId === state.player.id);
  const opponentAttacks = state.attackHistory.filter((a) => a.attackerId === state.opponent.id);

  const playerHits = playerAttacks.filter((a) => a.result === "hit" || a.result === "sunk").length;
  const playerMisses = playerAttacks.filter((a) => a.result === "miss").length;
  const opponentHits = opponentAttacks.filter((a) => a.result === "hit" || a.result === "sunk").length;
  const opponentMisses = opponentAttacks.filter((a) => a.result === "miss").length;

  const matchData: MatchHistoryInsert = {
    player_id: user.id,
    // Only custom grids are real UUIDs — the classic config id isn't a valid FK.
    grid_id: isUuid(state.gridConfig.id) ? state.gridConfig.id : null,
    outcome,
    ai_difficulty: state.opponent.aiDifficulty ?? "medium",
    total_turns: state.turnNumber,
    player_hits: playerHits,
    player_misses: playerMisses,
    opponent_hits: opponentHits,
    opponent_misses: opponentMisses,
    // Full replay snapshot (grids + fleets + attacks) so the match can be
    // reconstructed shot-by-shot on /replay/[id].
    attack_log: buildReplayPayload(state) as unknown as Json,
    duration_seconds: duration,
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await saveMatch(supabase as any, matchData);
  } catch (error) {
    console.error("Failed to persist match:", error);
    throw error;
  }
}
