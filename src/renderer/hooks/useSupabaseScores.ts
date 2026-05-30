import { useState, useCallback } from 'react';
import { saveScore, getTopScores, getPlayerBest, type ScoreRow } from '../supabase';

const PLAYER_NAME_KEY = 'aio_player_name';
const SYNCED_KEY = 'aio_synced_scores';

function getPlayerName(): string {
  let name = localStorage.getItem(PLAYER_NAME_KEY);
  if (!name) {
    name = 'Player' + Math.random().toString(36).slice(2, 6);
    localStorage.setItem(PLAYER_NAME_KEY, name);
  }
  return name;
}

export function useSupabaseScores() {
  const [leaderboard, setLeaderboard] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(false);

  const submitScore = useCallback(async (gameId: string, score: number) => {
    const playerName = getPlayerName();
    const { data } = await saveScore(gameId, playerName, score);
    if (data) {
      const synced = JSON.parse(localStorage.getItem(SYNCED_KEY) || '{}');
      synced[gameId] = score;
      localStorage.setItem(SYNCED_KEY, JSON.stringify(synced));
    }
    return !!data;
  }, []);

  const fetchLeaderboard = useCallback(async (gameId: string) => {
    setLoading(true);
    const { data } = await getTopScores(gameId);
    if (data) setLeaderboard(data);
    setLoading(false);
    return data || [];
  }, []);

  const fetchPlayerBest = useCallback(async (gameId: string) => {
    return getPlayerBest(gameId, getPlayerName());
  }, []);

  return { submitScore, fetchLeaderboard, fetchPlayerBest, leaderboard, loading };
}
