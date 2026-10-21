/**
 * Temporary smoke check for Phase 3 (AI difficulty + replay reconstruction).
 * Run with: npx --yes tsx scripts/verify-phase3.ts
 */
import {
  DEFAULT_GRID_CONFIG,
  buildEmptyGrid,
  buildFogGrid,
  applyObstacles,
} from "../src/store/gameHelpers";
import { stampFleetOnGrid } from "../src/store/gameHelpers";
import { pickAiTarget, resolveAttack } from "../src/store/combat";
import { generateRandomFleet } from "../src/store/placement";
import {
  buildReplayPayload,
  datasetFromGameState,
  datasetFromMatchRow,
  isReplayPayload,
  buildReplaySnapshots,
} from "../src/lib/replay";
import type { AttackRecord, GameState, GridTile, Json, MatchHistoryRow, Ship } from "../src/types";

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function makeShip(id: string, row: number, col: number, size: number, orientation: "horizontal" | "vertical"): Ship {
  const coords = Array.from({ length: size }, (_, i) => ({
    row: orientation === "vertical" ? row + i : row,
    col: orientation === "horizontal" ? col + i : col,
  }));
  return {
    id,
    class: size === 5 ? "carrier" : "destroyer",
    name: `Ship ${id}`,
    size,
    orientation,
    origin: { row, col },
    occupiedCoordinates: coords,
    hitCoordinates: [],
    isSunk: false,
  };
}

function mark(grid: GridTile[][], row: number, col: number, type: GridTile["type"]) {
  grid[row][col] = { ...grid[row][col], type };
}

// ------------------------------------------------------------
// 1. HARD AI extends a discovered line
// ------------------------------------------------------------
console.log("\nHard AI — line pursuit");
{
  const grid = buildEmptyGrid(10, 10);
  mark(grid, 4, 2, "hit");
  mark(grid, 4, 3, "hit");
  const picks = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const t = pickAiTarget(grid, 10, 10, "hard");
    picks.add(`${t.row},${t.col}`);
  }
  const valid = [...picks].every((p) => p === "4,1" || p === "4,4");
  check("targets open ends of a horizontal line", valid && picks.size > 0, `picks=${[...picks]}`);

  // Sunk hits must not be revisited.
  const afterSunk = buildEmptyGrid(10, 10);
  mark(afterSunk, 4, 2, "sunk");
  mark(afterSunk, 4, 3, "sunk");
  const repick = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const t = pickAiTarget(afterSunk, 10, 10, "hard");
    repick.add(`${t.row},${t.col}`);
  }
  check("ignores sunk ship tiles", !repick.has("4,2") && !repick.has("4,3"));
}

// ------------------------------------------------------------
// 2. EASY AI never fires twice at the same tile
// ------------------------------------------------------------
console.log("\nEasy AI — random fire");
{
  const grid = buildEmptyGrid(10, 10);
  mark(grid, 0, 0, "miss");
  mark(grid, 0, 1, "hit");
  let ok = true;
  for (let i = 0; i < 200; i++) {
    const t = pickAiTarget(grid, 10, 10, "easy");
    if ((t.row === 0 && (t.col === 0 || t.col === 1))) ok = false;
  }
  check("never targets spent tiles", ok);
}

// ------------------------------------------------------------
// 3. AI vs AI full match terminates (no stalls / crashes)
// ------------------------------------------------------------
console.log("\nFull simulated match");
{
  const config = DEFAULT_GRID_CONFIG;
  const playerFleet = generateRandomFleet(config);
  let playerGrid = stampFleetOnGrid(applyObstacles(buildEmptyGrid(10, 10), config), playerFleet);
  let fleet = playerFleet;
  let turns = 0;
  let won = false;
  while (turns < 200 && !won) {
    const target = pickAiTarget(playerGrid, 10, 10, "hard");
    const res = resolveAttack(target, fleet, playerGrid);
    fleet = res.updatedFleet;
    playerGrid = res.updatedGrid;
    turns++;
    won = fleet.every((s) => s.isSunk);
  }
  check("hard AI sinks a random fleet", won, `turns=${turns}`);
  check("finishes within 100 shots", turns <= 100, `turns=${turns}`);
}

// ------------------------------------------------------------
// 4. Replay reconstruction
// ------------------------------------------------------------
console.log("\nReplay reconstruction");
{
  const config = DEFAULT_GRID_CONFIG;
  const target = makeShip("enemy-1", 0, 0, 2, "horizontal");
  const own = makeShip("own-1", 8, 8, 2, "vertical");

  const attacks: AttackRecord[] = [
    { turnNumber: 1, attackerId: "local-player", coordinate: { row: 9, col: 9 }, result: "miss", timestamp: "t1" },
    { turnNumber: 2, attackerId: "ai-opponent", coordinate: { row: 8, col: 8 }, result: "hit", timestamp: "t2" },
    { turnNumber: 3, attackerId: "local-player", coordinate: { row: 0, col: 0 }, result: "hit", timestamp: "t3" },
    { turnNumber: 4, attackerId: "ai-opponent", coordinate: { row: 9, col: 8 }, result: "miss", timestamp: "t4" },
    { turnNumber: 5, attackerId: "local-player", coordinate: { row: 0, col: 1 }, result: "sunk", sunkShipId: "enemy-1", timestamp: "t5" },
  ];

  const state = {
    gameId: "g1",
    phase: "game_over",
    turn: "player",
    turnNumber: 5,
    player: { id: "local-player", type: "human", displayName: "Captain" },
    opponent: { id: "ai-opponent", type: "ai", displayName: "Admiral AI", aiDifficulty: "hard" },
    gridConfig: config,
    playerGrid: stampFleetOnGrid(applyObstacles(buildEmptyGrid(10, 10), config), [own]),
    opponentGrid: buildFogGrid(10, 10),
    playerFleet: [own],
    opponentFleet: [target],
    attackHistory: attacks,
    winner: "player",
    endedAt: "2026-01-01T00:00:10.000Z",
    placementMode: { active: false, shipClass: null, size: 0, orientation: "horizontal" },
    isLoading: false,
    error: null,
  } as unknown as GameState;

  const payload = buildReplayPayload(state);
  check("payload validates", isReplayPayload(payload));
  check("payload captures fleets", payload.opponentFleet.length === 1 && payload.playerFleet.length === 1);

  const dataset = datasetFromGameState(state);
  const snapshots = buildReplaySnapshots(dataset);
  check("one snapshot per attack + setup", snapshots.length === attacks.length + 1, `got ${snapshots.length}`);

  const last = snapshots[snapshots.length - 1];
  check("final enemy hit tile is marked sunk", last.opponentGrid[0][1].type === "sunk", last.opponentGrid[0][1].type);
  check("sunk marks the whole ship", last.opponentGrid[0][0].type === "sunk", last.opponentGrid[0][0].type);
  check("player miss recorded", last.opponentGrid[9][9].type === "miss");
  check("AI hit recorded on own grid", last.playerGrid[8][8].type === "hit");
  check("hit/miss counters", last.playerHits === 2 && last.playerMisses === 1 && last.opponentHits === 1 && last.opponentMisses === 1, JSON.stringify({
    ph: last.playerHits, pm: last.playerMisses, oh: last.opponentHits, om: last.opponentMisses,
  }));
  check("ships afloat counts", last.opponentShipsAfloat === 0 && last.playerShipsAfloat === 1);
  check("setup frame has no attacks applied", snapshots[0].lastAttack === null && snapshots[0].playerHits === 0);
  check("scrubbing to step 1 shows only first shot", snapshots[1].opponentGrid[9][9].type === "miss" && snapshots[1].opponentGrid[0][0].type === "fog");

  // Dataset from a persisted row (new format)
  const row: MatchHistoryRow = {
    id: "m1",
    player_id: "local-player",
    grid_id: null,
    outcome: "win" as const,
    ai_difficulty: "hard" as const,
    total_turns: 5,
    player_hits: 2,
    player_misses: 1,
    opponent_hits: 1,
    opponent_misses: 1,
    attack_log: payload as unknown as Json,
    duration_seconds: 10,
    created_at: "2026-01-01T00:00:10.000Z",
  };
  const fromRow = datasetFromMatchRow(row);
  check("row dataset keeps fleets", fromRow.hasFleets && fromRow.opponentFleet.length === 1);
  check("row dataset replays same attack count", buildReplaySnapshots(fromRow).length === attacks.length + 1);

  // Legacy row (bare attack array)
  const legacy = datasetFromMatchRow({ ...row, attack_log: attacks as unknown as Json });
  check("legacy row falls back to shot-only replay", !legacy.hasFleets && legacy.attacks.length === attacks.length);
  const legacySnaps = buildReplaySnapshots(legacy);
  check("legacy replay paints recorded results", legacySnaps[legacySnaps.length - 1].opponentGrid[0][0].type === "hit");

  // Malformed payload must not crash
  const malformed = datasetFromMatchRow({ ...row, attack_log: { version: 1, gridConfig: { rows: 0 } } });
  check("malformed payload degrades gracefully", buildReplaySnapshots(malformed).length >= 1);

  // Regression: payloads saved at game over carry final damage on the fleets.
  const damagedState = {
    ...(state as unknown as Record<string, unknown>),
    playerFleet: [
      { ...state.playerFleet[0], isSunk: true, hitCoordinates: [...state.playerFleet[0].occupiedCoordinates] },
    ],
    opponentFleet: [
      { ...state.opponentFleet[0], isSunk: true, hitCoordinates: [...state.opponentFleet[0].occupiedCoordinates] },
    ],
  } as unknown as GameState;
  const damagedSnaps = buildReplaySnapshots(datasetFromGameState(damagedState));
  check(
    "replay starts with fleets undamaged",
    damagedSnaps[0].opponentShipsAfloat === 1 && damagedSnaps[0].playerShipsAfloat === 1,
    JSON.stringify({ enemy: damagedSnaps[0].opponentShipsAfloat, own: damagedSnaps[0].playerShipsAfloat })
  );
  check(
    "replay re-applies the logged damage",
    damagedSnaps[damagedSnaps.length - 1].opponentShipsAfloat === 0
  );
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
