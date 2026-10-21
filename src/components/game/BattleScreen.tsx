"use client";

import { useGameStore } from "@/store";
import { BattleGrid } from "./BattleGrid";
import { StatusBar } from "./StatusBar";
import type { Coordinate } from "@/types";

/** Battle screen — active combat phase.
 * Player attacks opponent's grid; AI responds automatically.
 */
export function BattleScreen() {
  const { playerGrid, opponentGrid, attackCell, turn, phase } = useGameStore();
  const isPlayerTurn = turn === "player" && phase === "battle";

  function playSound() {
    if (!window.AudioContext) return;
    try {
      const ctx = new window.AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(0);

      // Medium frequency for a "pew" sound
      oscillator.frequency.value = 440;

      gainNode.gain.value = 0.2;
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    } catch {
      // Silently fail if audio context cannot be created
    }
  }

  function handleAttack(coord: Coordinate) {
    if (!isPlayerTurn) return;
    attackCell(coord);
    playSound();
  }

  return (
    <div className="flex flex-col gap-4 py-6">
      <StatusBar />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Opponent's grid (attack here) */}
        <div className="flex flex-col gap-3">
          <h2 className="text-ocean-100 font-semibold text-lg">
            Enemy Waters
          </h2>
          <div className="max-w-md mx-auto w-full">
            <BattleGrid
              grid={opponentGrid}
              label="Enemy grid — attack here"
              onCellClick={handleAttack}
              disabled={!isPlayerTurn}
              showLabels
            />
          </div>
        </div>

        {/* Player's grid (defence view) */}
        <div className="flex flex-col gap-3">
          <h2 className="text-ocean-100 font-semibold text-lg">
            Your Fleet
          </h2>
          <div className="max-w-md mx-auto w-full">
            <BattleGrid
              grid={playerGrid}
              label="Your grid — defence"
              disabled
              showLabels
            />
          </div>
        </div>
      </div>
    </div>
  );
}