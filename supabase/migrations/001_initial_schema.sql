-- ============================================================
-- PHASE 1 — Initial Database Schema & RLS Policies
-- Run this in the Supabase SQL Editor, or via: supabase db push
-- ============================================================

-- ---- Custom ENUM types ----------------------------------------
DROP TYPE IF EXISTS match_outcome CASCADE;
CREATE TYPE match_outcome AS ENUM ('win', 'loss', 'draw');
DROP TYPE IF EXISTS ai_difficulty CASCADE;
CREATE TYPE ai_difficulty AS ENUM ('easy', 'medium', 'hard');

-- ============================================================
-- UTILITY: auto-stamp updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT        NOT NULL UNIQUE
                            CONSTRAINT username_length CHECK (char_length(username) BETWEEN 3 AND 32),
  avatar_url  TEXT,
  wins        INTEGER     NOT NULL DEFAULT 0 CONSTRAINT wins_nn   CHECK (wins   >= 0),
  losses      INTEGER     NOT NULL DEFAULT 0 CONSTRAINT losses_nn CHECK (losses >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a profile row on every new sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLE: custom_grids
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_grids (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CONSTRAINT grid_name_len CHECK (char_length(name) BETWEEN 1 AND 80),
  description TEXT        CONSTRAINT grid_desc_len CHECK (char_length(description) <= 400),
  grid_data   JSONB       NOT NULL,
  is_public   BOOLEAN     NOT NULL DEFAULT false,
  play_count  INTEGER     NOT NULL DEFAULT 0 CONSTRAINT play_count_nn CHECK (play_count >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_grids_author ON public.custom_grids(author_id);
CREATE INDEX IF NOT EXISTS idx_custom_grids_public ON public.custom_grids(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_custom_grids_gin    ON public.custom_grids USING GIN(grid_data);

CREATE OR REPLACE TRIGGER trg_custom_grids_updated_at
  BEFORE UPDATE ON public.custom_grids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Atomic play_count increment
CREATE OR REPLACE FUNCTION public.increment_grid_play_count(grid_id UUID)
RETURNS VOID LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.custom_grids SET play_count = play_count + 1 WHERE id = grid_id;
END;
$$;

-- ============================================================
-- TABLE: match_history
-- ============================================================
-- Drop existing table if present (idempotent — safe for fresh setup)
DROP TABLE IF EXISTS public.match_history CASCADE;

CREATE TABLE public.match_history (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  grid_id          UUID          REFERENCES public.custom_grids(id) ON DELETE SET NULL,
  outcome          match_outcome NOT NULL,
  ai_difficulty    ai_difficulty NOT NULL,
  total_turns      INTEGER       NOT NULL CONSTRAINT turns_pos    CHECK (total_turns    >  0),
  player_hits      INTEGER       NOT NULL DEFAULT 0 CONSTRAINT ph_nn CHECK (player_hits   >= 0),
  player_misses    INTEGER       NOT NULL DEFAULT 0 CONSTRAINT pm_nn CHECK (player_misses >= 0),
  opponent_hits    INTEGER       NOT NULL DEFAULT 0 CONSTRAINT oh_nn CHECK (opponent_hits  >= 0),
  opponent_misses  INTEGER       NOT NULL DEFAULT 0 CONSTRAINT om_nn CHECK (opponent_misses >= 0),
  attack_log       JSONB         NOT NULL DEFAULT '[]'::jsonb,
  duration_seconds INTEGER       CONSTRAINT dur_pos CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_history_player  ON public.match_history(player_id);
CREATE INDEX IF NOT EXISTS idx_match_history_outcome ON public.match_history(player_id, outcome);
CREATE INDEX IF NOT EXISTS idx_match_history_created ON public.match_history(created_at DESC);

-- ============================================================
-- LEADERBOARD RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  player_id   UUID,
  username    TEXT,
  avatar_url  TEXT,
  total_games BIGINT,
  wins        BIGINT,
  losses      BIGINT,
  win_rate    NUMERIC,
  avg_turns   NUMERIC
)
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id                                                         AS player_id,
    p.username,
    p.avatar_url,
    COUNT(*)                                                     AS total_games,
    COUNT(*) FILTER (WHERE m.outcome = 'win')                    AS wins,
    COUNT(*) FILTER (WHERE m.outcome = 'loss')                   AS losses,
    ROUND(
      COUNT(*) FILTER (WHERE m.outcome = 'win')::NUMERIC
      / NULLIF(COUNT(*), 0) * 100, 1
    )                                                            AS win_rate,
    ROUND(AVG(m.total_turns), 1)                                 AS avg_turns
  FROM public.profiles      p
  JOIN public.match_history m ON m.player_id = p.id
  GROUP BY p.id, p.username, p.avatar_url
  HAVING COUNT(*) >= 1
  ORDER BY win_rate DESC, total_games DESC
  LIMIT p_limit;
$$;

-- ============================================================
-- ROW LEVEL SECURITY — profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- ROW LEVEL SECURITY — custom_grids
-- ============================================================
ALTER TABLE public.custom_grids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grids_select" ON public.custom_grids;
CREATE POLICY "grids_select"
  ON public.custom_grids FOR SELECT
  USING (is_public = true OR auth.uid() = author_id);

DROP POLICY IF EXISTS "grids_insert_own" ON public.custom_grids;
CREATE POLICY "grids_insert_own"
  ON public.custom_grids FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "grids_update_own" ON public.custom_grids;
CREATE POLICY "grids_update_own"
  ON public.custom_grids FOR UPDATE
  USING     (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "grids_delete_own" ON public.custom_grids;
CREATE POLICY "grids_delete_own"
  ON public.custom_grids FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================
-- ROW LEVEL SECURITY — match_history
-- ============================================================
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_select_own" ON public.match_history;
CREATE POLICY "matches_select_own"
  ON public.match_history FOR SELECT
  USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "matches_insert_own" ON public.match_history;
CREATE POLICY "matches_insert_own"
  ON public.match_history FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- No UPDATE / DELETE policies — match records are immutable.
