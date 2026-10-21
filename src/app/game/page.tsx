"use client";

import { useGameStore } from "@/store";
import { AppShell } from "@/components/layout";
import {
  LobbyScreen,
  SetupScreen,
  BattleScreen,
  GameOverScreen,
} from "@/components/game";

/**
 * Game route — switches view based on phase.
 * Phase sequence: idle → setup → battle → game_over.
 */
export default function GamePage() {
  const phase = useGameStore((s) => s.phase);

  return (
    <AppShell>
      {phase === "idle"      && <LobbyScreen />}
      {phase === "setup"     && <SetupScreen />}
      {phase === "battle"    && <BattleScreen />}
      {phase === "game_over" && <GameOverScreen />}
    </AppShell>
  );
}
