"use client";

import { useGameStore } from "@/store";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/ui";

/**
 * Ship roster — shows all ships in the fleet config with their placement status.
 * Phase 3: Now interactive — click to select a ship for placement.
 */
export function ShipRoster() {
  const { gridConfig, playerFleet, phase, placementMode, startPlacement, removeShip } = useGameStore();

  if (phase !== "setup") return null;

  const specs = gridConfig.fleetConfig.ships;
  const placed = playerFleet.length;
  const required = specs.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-ocean-100 font-semibold text-sm">Your Fleet</h3>
        <Badge variant={placed === required ? "success" : "default"}>
          {placed}/{required}
        </Badge>
      </div>

      <ul className="space-y-2" role="list">
        {specs.map((spec) => {
          const placedShips = playerFleet.filter((s) => s.class === spec.class);
          const count = placedShips.length;
          const complete = count === spec.count;
          const needsMore = count < spec.count;
          const isActive = placementMode.active && placementMode.shipClass === spec.class;

          return (
            <li
              key={spec.class}
              className={cn(
                "flex flex-col gap-2 p-2 rounded-lg border transition-all",
                isActive
                  ? "border-ocean-400 bg-ocean-700/50 ring-2 ring-ocean-400"
                  : complete
                  ? "border-emerald-700 bg-emerald-900/20"
                  : "border-ocean-700 bg-ocean-800/40"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-ocean-100 text-sm font-medium">
                    {spec.name}
                  </span>
                  <span className="text-ocean-400 text-xs">
                    {spec.size} tiles
                  </span>
                </div>
                <div className="text-xs font-semibold">
                  {complete ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-ocean-500">
                      {count}/{spec.count}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1">
                {needsMore && !isActive && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startPlacement(spec.class, spec.size)}
                    className="flex-1 text-xs"
                  >
                    + Place
                  </Button>
                )}
                {placedShips.map((ship) => (
                  <Button
                    key={ship.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => removeShip(ship.id)}
                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    title="Remove this ship"
                  >
                    ✕
                  </Button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
