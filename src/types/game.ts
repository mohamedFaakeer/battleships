// ============================================================
// CORE GAME PRIMITIVES
// ============================================================

/** A zero-based (row, col) coordinate on any grid. */
export interface Coordinate {
  row: number;
  col: number;
}

/** All possible states a single grid tile can hold. */
export type TileType =
  | "water"      // empty, un-attacked ocean tile
  | "fog"        // hidden opponent tile (not yet revealed)
  | "ship"       // player's own ship tile (visible to owner only)
  | "hit"        // a ship tile that has been struck
  | "miss"       // a water tile that has been attacked
  | "sunk"       // part of a fully-destroyed ship
  | "obstacle";  // impassable terrain (custom grid feature)

/** A single rendered tile in the grid — carries state + metadata. */
export interface GridTile {
  coordinate: Coordinate;
  type: TileType;
  /** If occupied by a ship, the ship's unique ID for cross-referencing. */
  shipId?: string;
  /** If part of an obstacle cluster. */
  obstacleId?: string;
}

// ============================================================
// SHIP DEFINITIONS
// ============================================================

/** Canonical ship classes used in the game. Extensible for custom modes. */
export type ShipClass =
  | "carrier"     // 5 tiles
  | "battleship"  // 4 tiles
  | "cruiser"     // 3 tiles
  | "submarine"   // 3 tiles
  | "destroyer";  // 2 tiles

export type Orientation = "horizontal" | "vertical";

/** A ship as it exists in the game world. */
export interface Ship {
  id: string;
  class: ShipClass;
  /** Display label, e.g. "USS Carrier". */
  name: string;
  size: number;
  orientation: Orientation;
  /** Top-left anchor coordinate of the ship. */
  origin: Coordinate;
  /** Every tile this ship occupies. Derived from origin + size + orientation. */
  occupiedCoordinates: Coordinate[];
  /** IDs of coordinates that have been hit. */
  hitCoordinates: Coordinate[];
  isSunk: boolean;
}

/** Static fleet configuration — defines what ships are in play. */
export interface FleetConfig {
  ships: Array<{
    class: ShipClass;
    name: string;
    size: number;
    count: number;
  }>;
}

// ============================================================
// GRID CONFIGURATION
// ============================================================

/** Defines the shape, size, and fixed obstacles of a game grid. */
export interface GridConfig {
  id: string;
  /** Human-readable label, e.g. "Arctic Bay". */
  name: string;
  rows: number;
  cols: number;
  /** Fixed obstacle coordinates — tiles ships cannot occupy. */
  obstacles: Coordinate[];
  /** Fleet layout for this config (can be overridden per match). */
  fleetConfig: FleetConfig;
}

// ============================================================
// PLAYER & AI
// ============================================================

export type PlayerType = "human" | "ai";
export type AiDifficulty = "easy" | "medium" | "hard";

export interface Player {
  id: string;
  type: PlayerType;
  displayName: string;
  /** Only present for AI players. */
  aiDifficulty?: AiDifficulty;
}

// ============================================================
// GAME STATE  (managed by Zustand — multiplayer-safe shape)
// ============================================================

export type GamePhase =
  | "idle"         // no game started
  | "setup"        // placement phase
  | "battle"       // active combat
  | "game_over";   // match concluded

export type TurnOwner = "player" | "opponent";

/** A single attack record — sufficient for full replay and analytics. */
export interface AttackRecord {
  turnNumber: number;
  attackerId: string;
  coordinate: Coordinate;
  result: "hit" | "miss" | "sunk";
  /** Set when a sunk result destroys a ship. */
  sunkShipId?: string;
  timestamp: string; // ISO 8601
}

/**
 * Snapshot of everything a finished match needs to be replayed frame-by-frame.
 * Stored in match_history.attack_log (JSONB) so a replay can reconstruct both
 * grids in full — including ship positions that the attack log alone omits.
 */
export interface ReplayPayload {
  version: 1;
  gridConfig: GridConfig;
  playerFleet: Ship[];
  opponentFleet: Ship[];
  attacks: AttackRecord[];
  winner: TurnOwner;
  difficulty: AiDifficulty;
  playerId: string;
  opponentId: string;
  endedAt: string | null;
}

/** The full client-side game state. */
export interface GameState {
  gameId: string | null;
  phase: GamePhase;
  turn: TurnOwner;
  turnNumber: number;

  // ---- Players ----
  player: Player;
  opponent: Player;

  // ---- Grids ----
  gridConfig: GridConfig;
  /** Player's own grid — ships visible. */
  playerGrid: GridTile[][];
  /** Opponent's grid — fog of war applied (ships hidden). */
  opponentGrid: GridTile[][];

  // ---- Fleets ----
  playerFleet: Ship[];
  opponentFleet: Ship[];

  // ---- History ----
  attackHistory: AttackRecord[];

  // ---- Result ----
  winner: TurnOwner | null;
  endedAt: string | null; // ISO 8601

  // ---- Placement mode (setup phase only) ----
  placementMode: {
    active: boolean;
    shipClass: ShipClass | null;
    size: number;
    orientation: Orientation;
  };

  // ---- UI flags ----
  isLoading: boolean;
  error: string | null;
}

// ============================================================
// ZUSTAND STORE ACTIONS (interface contract only)
// ============================================================

export interface GameActions {
  initGame: (config: GridConfig, difficulty: AiDifficulty) => void;
  placeShip: (ship: Omit<Ship, "hitCoordinates" | "isSunk">) => void;
  removeShip: (shipId: string) => void;
  randomiseFleet: () => void;
  confirmSetup: () => void;
  attackCell: (coordinate: Coordinate) => void;
  resetGame: () => void;
  setError: (message: string | null) => void;
  // Placement mode actions
  startPlacement: (shipClass: ShipClass, size: number) => void;
  cancelPlacement: () => void;
  toggleOrientation: () => void;
  placeShipAtCoord: (coord: Coordinate) => void;
}
