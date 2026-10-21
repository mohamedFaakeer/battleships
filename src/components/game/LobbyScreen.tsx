"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGameStore, DEFAULT_GRID_CONFIG } from "@/store";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getGridById, incrementPlayCount } from "@/services/gridService";
import { describeGridData, gridConfigFromRow, isUuid } from "@/lib/grids";
import type { AiDifficulty, GridConfig } from "@/types";

const DIFFICULTIES: Array<{ value: AiDifficulty; label: string; desc: string }> = [
  { value: "easy",   label: "Easy",   desc: "Random targeting" },
  { value: "medium", label: "Medium", desc: "Hunt & target" },
  { value: "hard",   label: "Hard",   desc: "Line pursuit & parity hunt" },
];

interface SelectedGrid {
  id: string;
  name: string;
  detail: string;
  config: GridConfig;
}

/**
 * Lobby screen — pick a battlefield and a difficulty, then start the match.
 * A custom grid arrives via /game?grid=<uuid> (from the grids browser).
 */
export function LobbyScreen() {
  const initGame = useGameStore((s) => s.initGame);
  const [difficulty, setDifficulty] = useState<AiDifficulty>("medium");

  const [grid, setGrid] = useState<SelectedGrid | null>(null);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridError, setGridError] = useState<string | null>(null);

  // Resolve ?grid=<uuid> once on mount.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("grid");
    if (!id || !isUuid(id)) return;

    let cancelled = false;
    setGridLoading(true);

    (async () => {
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = await getGridById(supabase as any, id);
        if (cancelled) return;
        if (!row) {
          setGridError("That grid could not be found — it may have been deleted.");
          return;
        }
        setGrid({
          id: row.id,
          name: row.name,
          detail: describeGridData(row.grid_data),
          config: gridConfigFromRow(row),
        });
      } catch (err) {
        if (!cancelled) setGridError((err as Error).message);
      } finally {
        if (!cancelled) setGridLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleStart() {
    initGame(grid ? grid.config : DEFAULT_GRID_CONFIG, difficulty);
    if (grid) {
      // Play counting is bookkeeping — never block starting the match.
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      incrementPlayCount(supabase as any, grid.id).catch(() => undefined);
    }
  }

  function useClassic() {
    setGrid(null);
    setGridError(null);
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="mb-8 select-none">
        <h1 className="text-4xl sm:text-5xl font-bold text-ocean-50 mb-2">
          ⚓ Battleships
        </h1>
        <p className="text-ocean-300 text-base sm:text-lg">
          Deploy your fleet. Sink the enemy. Command the seas.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* Battlefield */}
        <div className="rounded-xl border border-ocean-700 bg-ocean-900/40 p-3 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-ocean-500 text-[11px] uppercase tracking-wide">Battlefield</p>
              {gridLoading ? (
                <p className="text-ocean-300 text-sm">Loading grid…</p>
              ) : (
                <p className="text-ocean-50 font-semibold truncate">
                  {grid ? grid.name : "Classic"}
                </p>
              )}
              <p className="text-ocean-400 text-xs">
                {grid
                  ? grid.detail
                  : "10×10 · 5 ships · open water"}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              {grid && (
                <Button variant="ghost" size="sm" onClick={useClassic}>
                  Classic
                </Button>
              )}
              <Link href={`/grids${grid ? `?from=${grid.id}` : ""}`}>
                <Button variant="secondary" size="sm">
                  Change
                </Button>
              </Link>
            </div>
          </div>

          {gridError && (
            <p className="mt-2 text-amber-400 text-xs" role="alert">
              {gridError}{" "}
              <button
                type="button"
                onClick={useClassic}
                className="underline underline-offset-2 hover:text-amber-200"
              >
                Play classic instead
              </button>
            </p>
          )}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-ocean-200 text-sm font-medium mb-2">
            Choose Difficulty
          </legend>
          <div className="grid gap-2">
            {DIFFICULTIES.map((d) => (
              <label
                key={d.value}
                className={`
                  relative flex flex-col items-start p-3 rounded-xl border cursor-pointer
                  transition-all
                  ${
                    difficulty === d.value
                      ? "border-ocean-400 bg-ocean-800/60"
                      : "border-ocean-700 bg-ocean-900/40 hover:border-ocean-600"
                  }
                `}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={d.value}
                  checked={difficulty === d.value}
                  onChange={(e) => setDifficulty(e.target.value as AiDifficulty)}
                  className="sr-only"
                />
                <span className="text-ocean-100 font-semibold text-sm">
                  {d.label}
                </span>
                <span className="text-ocean-400 text-xs">
                  {d.desc}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Button
          variant="primary"
          size="lg"
          onClick={handleStart}
          className="w-full"
          disabled={gridLoading}
        >
          Start Game
        </Button>

        <p className="text-ocean-500 text-xs">
          Guests can play — sign in to save matches, replays and stats.{" "}
          <Link href="/grids" className="underline underline-offset-2 hover:text-ocean-300">
            Browse custom grids
          </Link>
        </p>
      </div>
    </div>
  );
}
