"use client";

import { useGameStore } from "@/store";
import { cn } from "@/lib/utils";

/**
 * Status bar — shows turn, phase, and hit/miss stats.
 * Appears at the top of both setup and battle screens.
 */
export function StatusBar() {
  const { phase, turn, turnNumber, attackHistory, player, opponent } = useGameStore();

  if (phase === "idle") return null;

  const playerAttacks = attackHistory.filter((a) => a.attackerId === player.id);
  const opponentAttacks = attackHistory.filter((a) => a.attackerId === opponent.id);

  const playerHits = playerAttacks.filter((a) => a.result === "hit" || a.result === "sunk").length;
  const playerMisses = playerAttacks.filter((a) => a.result === "miss").length;

  const opponentHits = opponentAttacks.filter((a) => a.result === "hit" || a.result === "sunk").length;
  const opponentMisses = opponentAttacks.filter((a) => a.result === "miss").length;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl
                 bg-ocean-900/60 border border-ocean-800"
      role="status"
      aria-live="polite"
    >
      {/* Phase indicator */}
      <div className="flex items-center gap-2">
        <span className="text-ocean-400 text-xs font-medium uppercase tracking-wide">
          {phase === "setup" ? "Setup Phase" : phase === "battle" ? `Turn ${turnNumber}` : "Game Over"}
        </span>
        {phase === "battle" && (
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-semibold",
              turn === "player"
                ? "bg-ocean-600 text-ocean-100"
                : "bg-red-900 text-red-300"
            )}
          >
            {turn === "player" ? "Your Turn" : "Opponent's Turn"}
          </span>
        )}
      </div>

      {/* Stats */}
      {phase === "battle" && (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex gap-1 items-baseline">
            <span className="text-ocean-400">You:</span>
            <span className="text-emerald-400 font-semibold">{playerHits}</span>
            <span className="text-ocean-600">/</span>
            <span className="text-ocean-500 font-semibold">{playerMisses}</span>
          </div>
          <div className="flex gap-1 items-baseline">
            <span className="text-ocean-400">AI:</span>
            <span className="text-red-400 font-semibold">{opponentHits}</span>
            <span className="text-ocean-600">/</span>
            <span className="text-ocean-500 font-semibold">{opponentMisses}</span>
          </div>
        </div>
      )}
    </div>
  );
}
