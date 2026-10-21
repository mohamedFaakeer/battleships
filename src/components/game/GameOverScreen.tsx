"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "@/store";
import { Button } from "@/components/ui";
import { datasetFromGameState } from "@/lib/replay";
import { BattleGrid } from "./BattleGrid";
import { ReplayScreen } from "./ReplayScreen";

/**
 * Game over screen — shows the result, a shot-by-shot replay of the match,
 * and the play-again CTA.
 */
export function GameOverScreen() {
  const state = useGameStore();
  const { winner, playerGrid, opponentGrid, resetGame, attackHistory, turnNumber } = state;

  const [showReplay, setShowReplay] = useState(false);
  const dataset = useMemo(() => datasetFromGameState(state), [state]);

  const playerWon = winner === "player";
  const totalMoves = attackHistory.length;

  if (showReplay) {
    return (
      <ReplayScreen
        dataset={dataset}
        autoPlay
        onExit={() => setShowReplay(false)}
        exitLabel="Back to result"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Result banner */}
      <div className="text-center space-y-2">
        <h1
          className={`text-4xl sm:text-5xl font-bold ${
            playerWon ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {playerWon ? "🎉 Victory!" : "💥 Defeated"}
        </h1>
        <p className="text-ocean-300 text-base">
          {playerWon
            ? `You sank the enemy fleet in ${turnNumber} turns!`
            : `The AI sank your fleet in ${turnNumber} turns.`}
        </p>
        <p className="text-ocean-500 text-sm">
          Total attacks: {totalMoves}
        </p>
      </div>

      {/* Grids side-by-side */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-ocean-100 font-semibold text-base text-center">
            Enemy Grid
          </h2>
          <div className="max-w-md mx-auto w-full">
            <BattleGrid
              grid={opponentGrid}
              label="Final enemy grid"
              disabled
              showLabels
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-ocean-100 font-semibold text-base text-center">
            Your Grid
          </h2>
          <div className="max-w-md mx-auto w-full">
            <BattleGrid
              grid={playerGrid}
              label="Final your grid"
              disabled
              showLabels
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="primary" size="lg" onClick={resetGame}>
          Play Again
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => setShowReplay(true)}
          disabled={totalMoves === 0}
        >
          Watch Replay
        </Button>
      </div>
    </div>
  );
}
