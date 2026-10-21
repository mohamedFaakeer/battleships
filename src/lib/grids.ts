import type { CustomGridRow, GridConfig, GridDataJson, ShipClass } from "@/types";
import { DEFAULT_GRID_CONFIG } from "@/store/gameHelpers";
import { generateRandomFleet } from "@/store/placement";

/** Display names and sizes for the standard ship classes. */
const FLEET_SPECS: Record<ShipClass, { name: string; size: number }> = {
  carrier: { name: "Carrier", size: 5 },
  battleship: { name: "Battleship", size: 4 },
  cruiser: { name: "Cruiser", size: 3 },
  submarine: { name: "Submarine", size: 3 },
  destroyer: { name: "Destroyer", size: 2 },
};

export const SHIP_CLASSES = Object.keys(FLEET_SPECS) as ShipClass[];

/** Sizes offered by the grid editor. */
export const GRID_SIZE_OPTIONS = [6, 8, 10, 12] as const;

/** At most this fraction of a grid may be obstacles (leaves room to deploy). */
export const MAX_OBSTACLE_RATIO = 0.3;

export function shipSpec(shipClass: ShipClass): { name: string; size: number } {
  return FLEET_SPECS[shipClass];
}

/** Standard fleet: one of every class. */
export function defaultFleetData(): GridDataJson["fleet"] {
  return SHIP_CLASSES.map((shipClass) => ({
    class: shipClass,
    ...FLEET_SPECS[shipClass],
    count: 1,
  }));
}

/** A fresh grid definition, ready to be edited or saved. */
export function makeGridData(
  size: number,
  overrides: Partial<GridDataJson> = {}
): GridDataJson {
  return {
    rows: size,
    cols: size,
    obstacles: [],
    fleet: defaultFleetData(),
    ...overrides,
  };
}

/** Builds the runtime GridConfig used by initGame from stored grid JSON. */
export function gridConfigFromData(
  data: GridDataJson,
  id: string,
  name: string
): GridConfig {
  const ships =
    Array.isArray(data.fleet) && data.fleet.length > 0 ? data.fleet : defaultFleetData();

  return {
    id,
    name,
    rows: data.rows,
    cols: data.cols,
    obstacles: (data.obstacles ?? []).map((o) => ({ row: o.row, col: o.col })),
    fleetConfig: {
      ships: ships.map((ship) => ({
        class: ship.class as ShipClass,
        name: ship.name,
        size: ship.size,
        count: ship.count,
      })),
    },
  };
}

/** Convenience: stored row → ready-to-play GridConfig. */
export function gridConfigFromRow(row: CustomGridRow): GridConfig {
  return gridConfigFromData(row.grid_data, row.id, row.name);
}

/** Total number of ship tiles a fleet configuration asks for. */
export function fleetTileCount(fleet: GridDataJson["fleet"]): number {
  return fleet.reduce((sum, ship) => sum + ship.size * ship.count, 0);
}

/** Counts how many cells an obstacle list claims (dedupes collisions). */
export function uniqueObstacleCount(obstacles: GridDataJson["obstacles"]): number {
  const seen = new Set<string>();
  for (const o of obstacles) seen.add(`${o.row}:${o.col}`);
  return seen.size;
}

/** True for a well-formed string UUID (custom grid ids are FKs). */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Validates a grid definition before saving or playing it.
 * Returns a human-readable problem, or null when the grid is playable.
 */
export function validateGridData(data: GridDataJson): string | null {
  const { rows, cols, obstacles, fleet } = data;

  if (!Number.isInteger(rows) || !Number.isInteger(cols)) return "Invalid grid size.";
  if (rows < 5 || cols < 5 || rows > 16 || cols > 16) {
    return "Grid size must be between 5 and 16 cells.";
  }

  if (!Array.isArray(obstacles) || !Array.isArray(fleet)) return "Malformed grid data.";

  const cells = rows * cols;
  const maxObstacles = Math.floor(cells * MAX_OBSTACLE_RATIO);
  const unique = new Set<string>();
  for (const o of obstacles) {
    if (
      !Number.isInteger(o.row) ||
      !Number.isInteger(o.col) ||
      o.row < 0 ||
      o.row >= rows ||
      o.col < 0 ||
      o.col >= cols
    ) {
      return "An obstacle sits outside the grid.";
    }
    unique.add(`${o.row}:${o.col}`);
  }
  if (unique.size > maxObstacles) {
    return `Too many obstacles — keep it under ${maxObstacles} for this size.`;
  }

  const totalShips = fleet.reduce((sum, ship) => sum + ship.count, 0);
  if (totalShips < 1) return "Add at least one ship.";
  if (fleetTileCount(fleet) + unique.size > cells) {
    return "The fleet doesn't fit on this grid.";
  }

  // Final gate: the fleet must actually be deployable around the obstacles.
  const config = gridConfigFromData(data, "preview", "Preview");
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      generateRandomFleet(config);
      return null;
    } catch {
      // Try again — placement is random, so a failure can be a bad roll.
    }
  }
  return "No room to deploy that fleet — remove some obstacles.";
}

/** Two lines of human-readable detail about a grid, for cards and pickers. */
export function describeGridData(data: GridDataJson): string {
  const ships = (data.fleet ?? []).reduce((sum, ship) => sum + ship.count, 0);
  return `${data.rows}×${data.cols} · ${ships} ${ships === 1 ? "ship" : "ships"} · ${
    data.obstacles?.length ?? 0
  } obstacles`;
}

/** Fallback when a stored grid can't be read — classic rules. */
export function fallbackGridConfig(): GridConfig {
  return DEFAULT_GRID_CONFIG;
}
