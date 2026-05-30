-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/johpqbvftbnaartegsrt/sql/new)
-- to create the scores table for the leaderboard.

CREATE TABLE IF NOT EXISTS scores (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public read access (anon key)
CREATE POLICY "Anyone can view scores"
  ON scores FOR SELECT
  USING (true);

-- Allow public insert access (anon key)
CREATE POLICY "Anyone can insert scores"
  ON scores FOR INSERT
  WITH CHECK (true);

-- Enable RLS but with public policies
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Create index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_scores_game_id_score ON scores (game_id, score DESC);
