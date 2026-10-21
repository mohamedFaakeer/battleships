import type { AiDifficulty, Coordinate, GridTile, Ship, TileType } from "@/types";
import { coordEquals, coordInArray, shuffle } from "@/lib/utils";

/** Tiles that can no longer be attacked. */
const SPENT: TileType[] = ["hit", "miss", "sunk", "obstacle"];

function isTargetable(tile: GridTile | undefined): boolean {
  return !!tile && !SPENT.includes(tile.type);
}

function coordKey(c: Coordinate): string {
  return `${c.row}:${c.col}`;
}

function inBounds(grid: GridTile[][], rows: number, cols: number, c: Coordinate): boolean {
  return c.row >= 0 && c.row < rows && c.col >= 0 && c.col < cols && !!grid[c.row]?.[c.col];
}

function collectAttackable(grid: GridTile[][], rows: number, cols: number): Coordinate[] {
  const out: Coordinate[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isTargetable(grid[r][c])) out.push({ row: r, col: c });
    }
  }
  return out;
}

/** Every attackable neighbour (up/down/left/right) of a coordinate. */
function attackableNeighbours(
  grid: GridTile[][],
  rows: number,
  cols: number,
  coord: Coordinate
): Coordinate[] {
  return [
    { row: coord.row - 1, col: coord.col },
    { row: coord.row + 1, col: coord.col },
    { row: coord.row, col: coord.col - 1 },
    { row: coord.row, col: coord.col + 1 },
  ].filter((c) => inBounds(grid, rows, cols, c) && isTargetable(grid[c.row][c.col]));
}

interface Segment {
  coords: Coordinate[];
  orientation: "horizontal" | "vertical";
}

/**
 * Groups revealed hits into straight-line segments.
 * A segment of length ≥ 2 tells the AI which way a wounded ship is lying.
 */
function buildSegments(hits: Coordinate[]): Segment[] {
  const remaining = new Set(hits.map(coordKey));
  const segments: Segment[] = [];

  for (const hit of hits) {
    if (!remaining.has(coordKey(hit))) continue;

    // Horizontal run through this hit.
    let minCol = hit.col;
    let maxCol = hit.col;
    while (remaining.has(coordKey({ row: hit.row, col: minCol - 1 }))) minCol--;
    while (remaining.has(coordKey({ row: hit.row, col: maxCol + 1 }))) maxCol++;

    if (maxCol - minCol >= 1) {
      const coords: Coordinate[] = [];
      for (let c = minCol; c <= maxCol; c++) coords.push({ row: hit.row, col: c });
      coords.forEach((c) => remaining.delete(coordKey(c)));
      segments.push({ coords, orientation: "horizontal" });
      continue;
    }

    // Vertical run through this hit.
    let minRow = hit.row;
    let maxRow = hit.row;
    while (remaining.has(coordKey({ row: minRow - 1, col: hit.col }))) minRow--;
    while (remaining.has(coordKey({ row: maxRow + 1, col: hit.col }))) maxRow++;

    if (maxRow - minRow >= 1) {
      const coords: Coordinate[] = [];
      for (let r = minRow; r <= maxRow; r++) coords.push({ row: r, col: hit.col });
      coords.forEach((c) => remaining.delete(coordKey(c)));
      segments.push({ coords, orientation: "vertical" });
      continue;
    }

    remaining.delete(coordKey(hit));
    segments.push({ coords: [hit], orientation: "horizontal" });
  }

  return segments.sort((a, b) => b.coords.length - a.coords.length);
}

/** Shuffled pick — keeps the AI from being exploitable/predictable. */
function pick(candidates: Coordinate[]): Coordinate {
  return shuffle(candidates)[0];
}

// ============================================================
// MEDIUM — hunt & target (follow up on any revealed hit)
// ============================================================

function pickMediumTarget(
  grid: GridTile[][],
  rows: number,
  cols: number,
  candidates: Coordinate[]
): Coordinate {
  const openHits = grid
    .flat()
    .filter((t) => t.type === "hit")
    .map((t) => t.coordinate);

  if (openHits.length > 0) {
    const adjacent = openHits.flatMap((hit) => attackableNeighbours(grid, rows, cols, hit));
    if (adjacent.length > 0) return pick(adjacent);
  }

  // Checkerboard sweep — every ship is ≥2 tiles, so parity covers all of them.
  const parity = candidates.filter((c) => (c.row + c.col) % 2 === 0);
  return pick(parity.length > 0 ? parity : candidates);
}

// ============================================================
// HARD — line pursuit + parity hunt
// ============================================================

function pickHardTarget(grid: GridTile[][], rows: number, cols: number): Coordinate {
  const openHits = grid
    .flat()
    .filter((t) => t.type === "hit")
    .map((t) => t.coordinate);

  if (openHits.length > 0) {
    const segments = buildSegments(openHits);

    // 1. Finish wounded ships: extend the longest known line, both ends first.
    for (const segment of segments) {
      if (segment.coords.length < 2) continue;
      const first = segment.coords[0];
      const last = segment.coords[segment.coords.length - 1];
      const ends: Coordinate[] =
        segment.orientation === "horizontal"
          ? [
              { row: first.row, col: first.col - 1 },
              { row: last.row, col: last.col + 1 },
            ]
          : [
              { row: first.row - 1, col: first.col },
              { row: last.row + 1, col: last.col },
            ];
      const validEnds = ends.filter(
        (c) => inBounds(grid, rows, cols, c) && isTargetable(grid[c.row][c.col])
      );
      if (validEnds.length > 0) return pick(validEnds);

      // Line is boxed in on both ends — probe perpendicular from its hits.
      const perpendicular = segment.coords.flatMap((c) =>
        segment.orientation === "horizontal"
          ? [
              { row: c.row - 1, col: c.col },
              { row: c.row + 1, col: c.col },
            ].filter((p) => inBounds(grid, rows, cols, p) && isTargetable(grid[p.row][p.col]))
          : [
              { row: c.row, col: c.col - 1 },
              { row: c.row, col: c.col + 1 },
            ].filter((p) => inBounds(grid, rows, cols, p) && isTargetable(grid[p.row][p.col]))
      );
      if (perpendicular.length > 0) return pick(perpendicular);
    }

    // 2. Fresh hit(s) with no direction yet — probe all four sides.
    const around = openHits.flatMap((hit) => attackableNeighbours(grid, rows, cols, hit));
    if (around.length > 0) return pick(around);
  }

  // 3. Hunt mode on a checkerboard pattern.
  const candidates = collectAttackable(grid, rows, cols);
  const parity = candidates.filter((c) => (c.row + c.col) % 2 === 0);
  return pick(parity.length > 0 ? parity : candidates);
}

/**
 * Chooses the AI's next shot.
 * easy   — random
 * medium — hunt & target, follows the last hit
 * hard   — hunt & target with ship-line inference and parity hunting
 */
export function pickAiTarget(
  playerGrid: GridTile[][],
  rows: number,
  cols: number,
  difficulty: AiDifficulty = "medium"
): Coordinate {
  const candidates = collectAttackable(playerGrid, rows, cols);
  if (candidates.length === 0) return { row: 0, col: 0 };

  switch (difficulty) {
    case "easy":
      return pick(candidates);
    case "hard":
      return pickHardTarget(playerGrid, rows, cols);
    case "medium":
    default:
      return pickMediumTarget(playerGrid, rows, cols, candidates);
  }
}

/** Applies a single attack against a fleet + grid, returns updated copies. */
export function resolveAttack(
  target: Coordinate,
  fleet: Ship[],
  grid: GridTile[][]
): {
  result: "hit" | "miss" | "sunk";
  sunkShipId: string | undefined;
  updatedFleet: Ship[];
  updatedGrid: GridTile[][];
} {
  const hitShip = fleet.find((s) =>
    coordInArray(target, s.occupiedCoordinates)
  );

  let result: "hit" | "miss" | "sunk" = "miss";
  let sunkShipId: string | undefined;
  let updatedFleet = fleet;

  if (hitShip) {
    const updated: Ship = {
      ...hitShip,
      hitCoordinates: [...hitShip.hitCoordinates, target],
      isSunk: false,
    };
    updated.isSunk = updated.hitCoordinates.length === updated.size;
    result = updated.isSunk ? "sunk" : "hit";
    if (updated.isSunk) sunkShipId = updated.id;
    updatedFleet = fleet.map((s) => (s.id === hitShip.id ? updated : s));
  }

  const newType: TileType =
    result === "miss" ? "miss" : result === "sunk" ? "sunk" : "hit";

  const sunkCoords =
    result === "sunk"
      ? (updatedFleet.find((s) => s.id === sunkShipId)
          ?.occupiedCoordinates ?? [])
      : [];

  const updatedGrid = grid.map((row) =>
    row.map((tile) => {
      if (coordEquals(tile.coordinate, target))
        return { ...tile, type: newType };
      if (result === "sunk" && coordInArray(tile.coordinate, sunkCoords))
        return { ...tile, type: "sunk" as TileType };
      return tile;
    })
  );

  return { result, sunkShipId, updatedFleet, updatedGrid };
}
