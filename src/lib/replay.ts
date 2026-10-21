import type {
  AiDifficulty,
  AttackRecord,
  Coordinate,
  GameState,
  GridConfig,
  GridTile,
  MatchHistoryRow,
  ReplayPayload,
  Ship,
  TurnOwner,
} from "@/types";
import {
  DEFAULT_GRID_CONFIG,
  buildEmptyGrid,
  buildFogGrid,
  applyObstacles,
  stampFleetOnGrid,
} from "@/store/gameHelpers";
import { coordEquals } from "./utils";

export const REPLAY_VERSION = 1 as const;

/** Everything the replay viewer needs — independent of the live game store. */
export interface ReplayDataset {
  gridName: string;
  rows: number;
  cols: number;
  difficulty: AiDifficulty;
  playerId: string;
  opponentId: string;
  playerName: string;
  opponentName: string;
  winner: TurnOwner;
  endedAt: string | null;
  attacks: AttackRecord[];
  /** Starting grids — player ships visible, enemy under fog. */
  playerGrid: GridTile[][];
  opponentGrid: GridTile[][];
  playerFleet: Ship[];
  opponentFleet: Ship[];
  /** False for legacy rows that only stored a bare attack log. */
  hasFleets: boolean;
}

/** A single reconstructed frame of the match. */
export interface ReplaySnapshot {
  step: number;
  totalSteps: number;
  playerGrid: GridTile[][];
  opponentGrid: GridTile[][];
  playerFleet: Ship[];
  opponentFleet: Ship[];
  playerHits: number;
  playerMisses: number;
  opponentHits: number;
  opponentMisses: number;
  playerShipsAfloat: number;
  opponentShipsAfloat: number;
  lastAttack: AttackRecord | null;
}

// ============================================================
// BUILDERS
// ============================================================

function cloneShip(ship: Ship): Ship {
  return {
    ...ship,
    origin: { ...ship.origin },
    occupiedCoordinates: ship.occupiedCoordinates.map((c) => ({ ...c })),
    hitCoordinates: ship.hitCoordinates.map((c) => ({ ...c })),
  };
}

/**
 * Fleets saved at game over carry their final damage state. A replay starts
 * from the opening position, so strip hits/sunk flags — the attack log is what
 * reapplies damage frame by frame.
 */
function freshShip(ship: Ship): Ship {
  return { ...cloneShip(ship), hitCoordinates: [], isSunk: false };
}

function cloneGrid(grid: GridTile[][]): GridTile[][] {
  return grid.map((row) => row.map((tile) => ({ ...tile, coordinate: { ...tile.coordinate } })));
}

/** Snapshot a finished (or in-progress) client game into the persisted shape. */
export function buildReplayPayload(state: GameState): ReplayPayload {
  return {
    version: REPLAY_VERSION,
    gridConfig: state.gridConfig,
    playerFleet: state.playerFleet,
    opponentFleet: state.opponentFleet,
    attacks: state.attackHistory,
    winner: state.winner ?? "player",
    difficulty: state.opponent.aiDifficulty ?? "medium",
    playerId: state.player.id,
    opponentId: state.opponent.id,
    endedAt: state.endedAt,
  };
}

function datasetFrom(config: GridConfig, payload: {
  playerId: string;
  opponentId: string;
  difficulty: AiDifficulty;
  winner: TurnOwner;
  endedAt: string | null;
  attacks: AttackRecord[];
  playerFleet: Ship[];
  opponentFleet: Ship[];
  hasFleets: boolean;
}): ReplayDataset {
  const base = applyObstacles(buildEmptyGrid(config.rows, config.cols), config);
  const playerFleet = payload.playerFleet.map(freshShip);

  return {
    gridName: config.name,
    rows: config.rows,
    cols: config.cols,
    difficulty: payload.difficulty,
    playerId: payload.playerId,
    opponentId: payload.opponentId,
    playerName: "You",
    opponentName: "Admiral AI",
    winner: payload.winner,
    endedAt: payload.endedAt,
    attacks: payload.attacks,
    playerFleet,
    opponentFleet: payload.opponentFleet.map(freshShip),
    hasFleets: payload.hasFleets,
    playerGrid: stampFleetOnGrid(base, playerFleet),
    opponentGrid: buildFogGrid(config.rows, config.cols),
  };
}

/** Build a dataset from the live store (used right after a match ends). */
export function datasetFromGameState(state: GameState): ReplayDataset {
  return datasetFrom(state.gridConfig, {
    playerId: state.player.id,
    opponentId: state.opponent.id,
    difficulty: state.opponent.aiDifficulty ?? "medium",
    winner: state.winner ?? "player",
    endedAt: state.endedAt,
    attacks: state.attackHistory,
    playerFleet: state.playerFleet,
    opponentFleet: state.opponentFleet,
    hasFleets: true,
  });
}

/** Build a dataset from a persisted payload (stored since Phase 3). */
export function datasetFromPayload(payload: ReplayPayload): ReplayDataset {
  return datasetFrom(payload.gridConfig, {
    playerId: payload.playerId,
    opponentId: payload.opponentId,
    difficulty: payload.difficulty,
    winner: payload.winner,
    endedAt: payload.endedAt,
    attacks: payload.attacks,
    playerFleet: payload.playerFleet,
    opponentFleet: payload.opponentFleet,
    hasFleets: true,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrow an unknown JSONB value to a ReplayPayload. */
export function isReplayPayload(value: unknown): value is ReplayPayload {
  if (!isRecord(value)) return false;
  if (value.version !== REPLAY_VERSION) return false;
  if (!isRecord(value.gridConfig)) return false;
  const rows = value.gridConfig.rows;
  const cols = value.gridConfig.cols;
  return (
    typeof rows === "number" &&
    typeof cols === "number" &&
    rows > 0 &&
    cols > 0 &&
    Array.isArray(value.attacks) &&
    Array.isArray(value.playerFleet) &&
    Array.isArray(value.opponentFleet)
  );
}

function isAttackRecord(value: unknown): value is AttackRecord {
  if (!isRecord(value)) return false;
  const coord = value.coordinate;
  return (
    isRecord(coord) &&
    typeof coord.row === "number" &&
    typeof coord.col === "number" &&
    (value.result === "hit" || value.result === "miss" || value.result === "sunk")
  );
}

/**
 * Build a dataset from a match_history row.
 * Newer rows carry a full ReplayPayload; older rows only stored the attack log,
 * in which case we still replay the shot sequence on empty grids.
 */
export function datasetFromMatchRow(row: MatchHistoryRow): ReplayDataset {
  const log = row.attack_log;

  if (isReplayPayload(log)) {
    return datasetFromPayload(log);
  }

  const rawLog: unknown[] = Array.isArray(log) ? log : [];
  const attacks = rawLog.filter(isAttackRecord);
  return datasetFrom(DEFAULT_GRID_CONFIG, {
    playerId: row.player_id,
    opponentId: "ai-opponent",
    difficulty: row.ai_difficulty,
    winner: row.outcome === "win" ? "player" : "opponent",
    endedAt: row.created_at,
    attacks,
    playerFleet: [],
    opponentFleet: [],
    hasFleets: false,
  });
}

// ============================================================
// FRAME RECONSTRUCTION
// ============================================================

function paintAttack(
  record: AttackRecord,
  defendingGrid: GridTile[][],
  defendingFleet: Ship[]
) {
  const { row, col } = record.coordinate;
  const tile = defendingGrid[row]?.[col];
  const type = record.result === "miss" ? "miss" : record.result === "sunk" ? "sunk" : "hit";
  if (tile) defendingGrid[row][col] = { ...tile, type };

  const ship = defendingFleet.find((s) => coordIn(s.occupiedCoordinates, record.coordinate));
  if (!ship) return;

  if (!coordIn(ship.hitCoordinates, record.coordinate)) {
    ship.hitCoordinates = [...ship.hitCoordinates, { ...record.coordinate }];
  }
  if (record.result === "sunk") {
    ship.isSunk = true;
    for (const coord of ship.occupiedCoordinates) {
      const t = defendingGrid[coord.row]?.[coord.col];
      if (t) defendingGrid[coord.row][coord.col] = { ...t, type: "sunk" };
    }
  }
}

function coordIn(list: Coordinate[], coord: Coordinate): boolean {
  return list.some((c) => coordEquals(c, coord));
}

function snapshotCounts(playerGrid: GridTile[][], opponentGrid: GridTile[][]) {
  let playerHits = 0;
  let playerMisses = 0;
  let opponentHits = 0;
  let opponentMisses = 0;
  for (const tile of opponentGrid.flat()) {
    if (tile.type === "hit" || tile.type === "sunk") playerHits++;
    else if (tile.type === "miss") playerMisses++;
  }
  for (const tile of playerGrid.flat()) {
    if (tile.type === "hit" || tile.type === "sunk") opponentHits++;
    else if (tile.type === "miss") opponentMisses++;
  }
  return { playerHits, playerMisses, opponentHits, opponentMisses };
}

/**
 * Replays the attack log once and returns one snapshot per step (step 0 = setup).
 * Snapshots are plain value copies, so the viewer can scrub freely.
 */
export function buildReplaySnapshots(dataset: ReplayDataset): ReplaySnapshot[] {
  const playerGrid = cloneGrid(dataset.playerGrid);
  const opponentGrid = cloneGrid(dataset.opponentGrid);
  const playerFleet = dataset.playerFleet.map(cloneShip);
  const opponentFleet = dataset.opponentFleet.map(cloneShip);

  const makeSnapshot = (step: number, lastAttack: AttackRecord | null): ReplaySnapshot => {
    const counts = snapshotCounts(playerGrid, opponentGrid);
    return {
      step,
      totalSteps: dataset.attacks.length,
      playerGrid: cloneGrid(playerGrid),
      opponentGrid: cloneGrid(opponentGrid),
      playerFleet: playerFleet.map(cloneShip),
      opponentFleet: opponentFleet.map(cloneShip),
      ...counts,
      playerShipsAfloat: playerFleet.filter((s) => !s.isSunk).length,
      opponentShipsAfloat: opponentFleet.filter((s) => !s.isSunk).length,
      lastAttack,
    };
  };

  const snapshots: ReplaySnapshot[] = [makeSnapshot(0, null)];

  dataset.attacks.forEach((record, index) => {
    const attackerIsPlayer = record.attackerId === dataset.playerId;
    const targetGrid = attackerIsPlayer ? opponentGrid : playerGrid;
    const targetFleet = attackerIsPlayer ? opponentFleet : playerFleet;

    // Skip malformed/out-of-bounds records rather than throwing mid-replay.
    if (targetGrid[record.coordinate.row]?.[record.coordinate.col]) {
      paintAttack(record, targetGrid, targetFleet);
    }
    snapshots.push(makeSnapshot(index + 1, record));
  });

  return snapshots;
}

/** Human-readable one-liner for a single attack, e.g. "Turn 7 · You → C4 · HIT". */
export function describeAttack(record: AttackRecord, dataset: ReplayDataset): string {
  const label = `${String.fromCharCode(65 + record.coordinate.col)}${record.coordinate.row + 1}`;
  const attacker = record.attackerId === dataset.playerId ? "You" : dataset.opponentName;
  const outcome = record.result === "miss" ? "MISS" : record.result === "sunk" ? "SUNK!" : "HIT";
  return `Turn ${record.turnNumber} · ${attacker} → ${label} · ${outcome}`;
}
