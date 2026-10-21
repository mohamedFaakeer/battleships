// ============================================================
// SUPABASE DATABASE ROW TYPES
// Mirror the exact PostgreSQL schema — used for type-safe queries.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---- profiles -----------------------------------------------

export interface ProfileRow {
  id: string;                  // UUID — mirrors auth.users.id
  username: string;
  avatar_url: string | null;
  wins: number;
  losses: number;
  created_at: string;          // timestamptz as ISO string
  updated_at: string;
}

export type ProfileInsert = Omit<ProfileRow, "wins" | "losses" | "created_at" | "updated_at"> & {
  wins?: number;
  losses?: number;
};

export type ProfileUpdate = Partial<
  Omit<ProfileRow, "id" | "created_at">
>;

// ---- custom_grids -------------------------------------------

/** The JSONB blob stored in custom_grids.grid_data */
export interface GridDataJson {
  rows: number;
  cols: number;
  obstacles: Array<{ row: number; col: number }>;
  fleet: Array<{
    class: string;
    name: string;
    size: number;
    count: number;
  }>;
}

export interface CustomGridRow {
  id: string;                  // UUID
  author_id: string;           // FK → profiles.id
  name: string;
  description: string | null;
  grid_data: GridDataJson;     // JSONB
  is_public: boolean;
  play_count: number;
  created_at: string;
  updated_at: string;
}

export type CustomGridInsert = Omit<
  CustomGridRow,
  "id" | "play_count" | "created_at" | "updated_at"
> & { id?: string };

export type CustomGridUpdate = Partial<
  Omit<CustomGridRow, "id" | "author_id" | "created_at">
>;

// ---- match_history ------------------------------------------

export type MatchOutcome = "win" | "loss" | "draw";
export type AiDifficultyDb = "easy" | "medium" | "hard";

export interface MatchHistoryRow {
  id: string;                  // UUID
  player_id: string;           // FK → profiles.id
  grid_id: string | null;      // FK → custom_grids.id (nullable = default grid)
  outcome: MatchOutcome;
  ai_difficulty: AiDifficultyDb;
  total_turns: number;
  player_hits: number;
  player_misses: number;
  opponent_hits: number;
  opponent_misses: number;
  /** Full attack log stored as JSONB for replay + analytics. */
  attack_log: Json;
  duration_seconds: number | null;
  created_at: string;
}

export type MatchHistoryInsert = Omit<
  MatchHistoryRow,
  "id" | "created_at"
> & { id?: string };

// ============================================================
// SUPABASE GENERATED DATABASE SHAPE
// Passed as the generic param to createClient<Database>()
// ============================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      custom_grids: {
        Row: CustomGridRow;
        Insert: CustomGridInsert;
        Update: CustomGridUpdate;
      };
      match_history: {
        Row: MatchHistoryRow;
        Insert: MatchHistoryInsert;
        Update: Record<string, never>; // matches are immutable — no update allowed
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_grid_play_count: {
        Args: { grid_id: string };
        Returns: undefined;
      };
      get_leaderboard: {
        Args: { p_limit?: number };
        Returns: Array<{
          player_id: string;
          username: string;
          avatar_url: string | null;
          total_games: number;
          wins: number;
          losses: number;
          win_rate: number;
          avg_turns: number;
        }>;
      };
    };
    Enums: {
      match_outcome: MatchOutcome;
      ai_difficulty: AiDifficultyDb;
    };
  };
}
