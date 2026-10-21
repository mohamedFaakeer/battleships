"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store";
import { Button } from "@/components/ui";
import { BattleGrid } from "./BattleGrid";
import { ShipRoster } from "./ShipRoster";
import { StatusBar } from "./StatusBar";
import { getOccupiedCoords, isValidPlacement } from "@/store/placement";
import type { Coordinate } from "@/types";import { LoadingSpinner } from "@/components/game/LoadingSpinner";
import { useClickSound } from "@/components/game/SoundManager";

/**
 * Setup screen — ship placement phase.
 * Phase 3: Interactive placement with hover preview.
 */
export function SetupScreen() {
  const {
    playerGrid,
    playerFleet,
    gridConfig,
    placementMode,
    randomiseFleet,
    confirmSetup,
    cancelPlacement,
    toggleOrientation,
    placeShipAtCoord,
    error,
  } = useGameStore();
  const { handleClick: handlePlaceClick } = useClickSound();

  const [hoverCoord, setHoverCoord] = useState<Coordinate | null>(null);
  const [isRandomising, setIsRandomising] = useState(false);

  const required = gridConfig.fleetConfig.ships.reduce((s, sp) => s + sp.count, 0);
  const canConfirm = playerFleet.length === required;

  // Keyboard controls
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!placementMode.active) return;

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        toggleOrientation();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelPlacement();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [placementMode.active, toggleOrientation, cancelPlacement]);

  // Compute preview coordinates based on hover position
  const previewCoords: Coordinate[] = (() => {
    if (!placementMode.active || !hoverCoord) return [];
    const coords = getOccupiedCoords(hoverCoord, placementMode.size, placementMode.orientation);
    // Only show preview if valid
    return isValidPlacement(coords, gridConfig, playerFleet) ? coords : [];
  })();

  // Click handler for placement
  function handleCellClick(coord: Coordinate) {
    if (placementMode.active) {
      placeShipAtCoord(coord);
      handlePlaceClick();
    }
  }

  return (
    <div className="flex flex-col gap-4 py-6">
      <StatusBar />

      {/* Placement mode banner */}
      {placementMode.active && (
        <div className="px-4 py-3 rounded-xl bg-ocean-700/50 border border-ocean-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-ocean-100 font-semibold text-sm">
              Placing {gridConfig.fleetConfig.ships.find((s) => s.class === placementMode.shipClass)?.name}
            </span>
            <span className="text-ocean-400 text-xs">
              Click on the grid to place • Press R to rotate • Esc to cancel
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={toggleOrientation}>
              ↻ Rotate ({placementMode.orientation === "horizontal" ? "→" : "↓"})
            </Button>
            <Button variant="ghost" size="sm" onClick={cancelPlacement}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
        {/* Grid with interactive placement */}
        <div className="flex flex-col gap-3">
          <h2 className="text-ocean-100 font-semibold text-lg">
            Deploy Your Fleet
          </h2>
          <div className="max-w-md mx-auto w-full">
            <BattleGrid
              grid={playerGrid}
              label="Your grid — place ships"
              showLabels
              disabled={false}
              onCellClick={handleCellClick}
              onCellHover={placementMode.active ? setHoverCoord : undefined}
              previewCoords={previewCoords}
            />
          </div>
        </div>

        {/* Right panel: roster + actions */}
        <div className="lg:w-64 space-y-4">
          <ShipRoster />

          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setIsRandomising(true);
                randomiseFleet();
                setTimeout(() => setIsRandomising(false), 800);
              }}
              className="w-full"
              disabled={placementMode.active}
            >
              {isRandomising ? (
                <LoadingSpinner size={24} />
              ) : "🎲 Randomise All"}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={confirmSetup}
              disabled={!canConfirm || placementMode.active}
              className="w-full"
            >
              {canConfirm ? "Confirm & Start Battle" : `Place ${required - playerFleet.length} more`}
            </Button>
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
