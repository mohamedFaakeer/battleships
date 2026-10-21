// Barrel export for all types — import from "@/types" everywhere.
export type {
  // game primitives
  Coordinate,
  TileType,
  GridTile,
  ShipClass,
  Orientation,
  Ship,
  FleetConfig,
  GridConfig,
  PlayerType,
  AiDifficulty,
  Player,
  GamePhase,
  TurnOwner,
  AttackRecord,
  ReplayPayload,
  GameState,
  GameActions,
} from "./game";

export type {
  // database
  Json,
  ProfileRow,
  ProfileInsert,
  ProfileUpdate,
  GridDataJson,
  CustomGridRow,
  CustomGridInsert,
  CustomGridUpdate,
  MatchOutcome,
  AiDifficultyDb,
  MatchHistoryRow,
  MatchHistoryInsert,
  Database,
} from "./database";
