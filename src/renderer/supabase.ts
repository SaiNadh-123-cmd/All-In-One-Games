import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://johpqbvftbnaartegsrt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvaHBxYnZmdGJuYWFydGVnc3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyOTk1NTEsImV4cCI6MjA1MDg3NTU1MX0.C1a5U-J6nGMOazA7rYR0D4q2k_JSQcFnq7c8JBNqHYg';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface ScoreRow {
  id?: number;
  game_id: string;
  player_name: string;
  score: number;
  created_at?: string;
}

export async function saveScore(gameId: string, playerName: string, score: number) {
  const { data, error } = await supabase
    .from('scores')
    .insert([{ game_id: gameId, player_name: playerName, score }])
    .select();
  if (error) console.warn('[Supabase] Failed to save score:', error);
  return { data, error };
}

export async function getTopScores(gameId: string, limit = 10) {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('game_id', gameId)
    .order('score', { ascending: false })
    .limit(limit);
  if (error) console.warn('[Supabase] Failed to load scores:', error);
  return { data: (data || []) as ScoreRow[], error };
}

export async function getPlayerBest(gameId: string, playerName: string) {
  const { data, error } = await supabase
    .from('scores')
    .select('score')
    .eq('game_id', gameId)
    .eq('player_name', playerName)
    .order('score', { ascending: false })
    .limit(1);
  if (error) console.warn('[Supabase] Failed to get player best:', error);
  return (data && data.length > 0) ? data[0].score : null;
}
