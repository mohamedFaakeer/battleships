"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { buildReplaySnapshots, describeAttack, type ReplayDataset } from "@/lib/replay";
import { BattleGrid } from "./BattleGrid";

const SPEEDS = [1, 2, 4] as const;
const BASE_INTERVAL_MS = 900;

interface ReplayScreenProps {
  dataset: ReplayDataset;
  /** Optional exit affordance back to the surrounding view. */
  onExit?: () => void;
  exitLabel?: string;
  /** Start playing as soon as the viewer mounts. */
  autoPlay?: boolean;
  className?: string;
}

/**
 * Match replay viewer.
 * Scrubs through a reconstructed snapshot per attack with play/pause,
 * step, speed, and timeline controls.
 */
export function ReplayScreen({
  dataset,
  onExit,
  exitLabel = "Back",
  autoPlay = false,
  className,
}: ReplayScreenProps) {
  const snapshots = useMemo(() => buildReplaySnapshots(dataset), [dataset]);
  const total = snapshots.length - 1;
  const [step, setStep] = useState(autoPlay ? 0 : total);
  const [playing, setPlaying] = useState(autoPlay && total > 0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const frame = snapshots[Math.min(step, total)];

  const goTo = useCallback(
    (next: number) => setStep(Math.max(0, Math.min(total, next))),
    [total]
  );

  // Playback timer — stops automatically on the final frame.
  useEffect(() => {
    if (!playing || total === 0) return;
    if (step >= total) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => {
      setStep((s) => {
        const next = Math.min(total, s + 1);
        if (next >= total) setPlaying(false);
        return next;
      });
    }, BASE_INTERVAL_MS / speed);
    return () => window.clearTimeout(id);
  }, [playing, step, total, speed]);

  // Keyboard shortcuts: ←/→ step, Space play/pause, Home/End jump.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPlaying(false);
        goTo(step - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPlaying(false);
        goTo(step + 1);
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => (step >= total ? false : !p));
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(total);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, step, total]);

  const playerWon = dataset.winner === "player";
  const finished = step >= total;
  const lastAttack = frame.lastAttack;
  const attackLabel = lastAttack ? describeAttack(lastAttack, dataset) : "Fleets deployed — awaiting first shot";

  return (
    <div className={cn("flex flex-col gap-5 py-6", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ocean-50">Match Replay</h1>
          <p className="text-ocean-400 text-sm mt-1">
            {dataset.gridName} · {dataset.difficulty} AI · {dataset.attacks.length} attacks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={playerWon ? "success" : "danger"}>
            {playerWon ? "Victory" : "Defeat"}
          </Badge>
          {onExit && (
            <Button variant="ghost" size="sm" onClick={onExit}>
              {exitLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Timeline + controls */}
      <div className="rounded-2xl border border-ocean-800 bg-ocean-900/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPlaying(false);
              goTo(0);
            }}
            disabled={step === 0}
            aria-label="Jump to start"
            title="Jump to start (Home)"
          >
            ⏮
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPlaying(false);
              goTo(step - 1);
            }}
            disabled={step === 0}
            aria-label="Previous attack"
            title="Previous attack (←)"
          >
            ◀
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (step >= total) goTo(0);
              setPlaying((p) => !p);
            }}
            disabled={total === 0}
            aria-label={playing ? "Pause replay" : "Play replay"}
            title={playing ? "Pause (Space)" : "Play (Space)"}
            className="min-w-[5.5rem]"
          >
            {playing ? "❚❚ Pause" : finished ? "↻ Replay" : "▶ Play"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPlaying(false);
              goTo(step + 1);
            }}
            disabled={finished}
            aria-label="Next attack"
            title="Next attack (→)"
          >
            ▶
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPlaying(false);
              goTo(total);
            }}
            disabled={finished}
            aria-label="Jump to end"
            title="Jump to end (End)"
          >
            ⏭
          </Button>

          <div className="ml-auto flex items-center gap-1" role="group" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-semibold transition-colors",
                  speed === s
                    ? "bg-ocean-500 text-white"
                    : "text-ocean-400 hover:text-ocean-100 hover:bg-ocean-800"
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="sr-only">Replay position</span>
          <input
            type="range"
            min={0}
            max={total}
            value={step}
            step={1}
            onChange={(e) => {
              setPlaying(false);
              goTo(Number(e.target.value));
            }}
            className="w-full accent-ocean-400 cursor-pointer"
            aria-label="Replay position"
            aria-valuetext={`Attack ${step} of ${total}`}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-ocean-300" role="status" aria-live="polite">
            {attackLabel}
          </span>
          <span className="text-ocean-500">
            Attack {step} / {total}
          </span>
        </div>
      </div>

      {/* Grids */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-ocean-100 font-semibold text-base">Enemy Waters</h2>
            {dataset.hasFleets && (
              <Badge variant="info">
                Afloat {frame.opponentShipsAfloat}/{dataset.opponentFleet.length}
              </Badge>
            )}
          </div>
          <div className="max-w-md mx-auto w-full">
            <BattleGrid
              grid={frame.opponentGrid}
              label="Enemy grid during replay"
              disabled
              showLabels
            />
          </div>
          <p className="text-center text-ocean-500 text-xs">
            Your hits {frame.playerHits} · misses {frame.playerMisses}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-ocean-100 font-semibold text-base">Your Fleet</h2>
            {dataset.hasFleets && (
              <Badge variant="info">
                Afloat {frame.playerShipsAfloat}/{dataset.playerFleet.length}
              </Badge>
            )}
          </div>
          <div className="max-w-md mx-auto w-full">
            <BattleGrid
              grid={frame.playerGrid}
              label="Your grid during replay"
              disabled
              showLabels
            />
          </div>
          <p className="text-center text-ocean-500 text-xs">
            Enemy hits {frame.opponentHits} · misses {frame.opponentMisses}
          </p>
        </div>
      </div>

      {!dataset.hasFleets && (
        <p className="text-ocean-500 text-xs text-center">
          This match was saved before fleet snapshots existed — ship positions aren&apos;t available,
          but every shot is replayed in order.
        </p>
      )}
    </div>
  );
}
