import type { GridConfig, GridTile, Ship, TileType } from "@/types";

// ============================================================
// DEFAULT GRID CONFIG  (classic 10×10, no obstacles)
// ============================================================

export const DEFAULT_GRID_CONFIG: GridConfig = {
  id: "classic-10x10",
  name: "Classic",
  rows: 10,
  cols: 10,
  obstacles: [],
  fleetConfig: {
    ships: [
      { class: "carrier",    name: "Carrier",    size: 5, count: 1 },
      { class: "battleship", name: "Battleship", size: 4, count: 1 },
      { class: "cruiser",    name: "Cruiser",    size: 3, count: 1 },
      { class: "submarine",  name: "Submarine",  size: 3, count: 1 },
      { class: "destroyer",  name: "Destroyer",  size: 2, count: 1 },
    ],
  },
};

// ============================================================
// GRID BUILDERS
// ============================================================

export function buildEmptyGrid(rows: number, cols: number): GridTile[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      coordinate: { row: r, col: c },
      type: "water" as TileType,
    }))
  );
}

export function buildFogGrid(rows: number, cols: number): GridTile[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      coordinate: { row: r, col: c },
      type: "fog" as TileType,
    }))
  );
}

export function applyObstacles(
  grid: GridTile[][],
  config: GridConfig
): GridTile[][] {
  const next = grid.map((r) => r.map((t) => ({ ...t })));
  config.obstacles.forEach(({ row, col }) => {
    if (next[row]?.[col]) {
      next[row][col] = {
        ...next[row][col],
        type: "obstacle",
        obstacleId: `obs-${row}-${col}`,
      };
    }
  });
  return next;
}

export function stampFleetOnGrid(
  baseGrid: GridTile[][],
  fleet: Ship[]
): GridTile[][] {
  const next = baseGrid.map((r) => r.map((t) => ({ ...t })));
  for (const ship of fleet) {
    for (const c of ship.occupiedCoordinates) {
      next[c.row][c.col] = { coordinate: c, type: "ship", shipId: ship.id };
    }
  }
  return next;
}
