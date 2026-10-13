// The daily shirt puzzle's results (streaks across devices for members).
import { sb } from '../supabase.ts';

export interface DailyResultRow {
  day: string;
  won: boolean;
  tries: number;
}

export async function loadDailyResults(): Promise<DailyResultRow[]> {
  const { data, error } = await (await sb()).from('daily_game_results').select('day, won, tries').order('day', { ascending: false }).limit(400);
  if (error) throw error;
  return data || [];
}

/** Records today's result once; a repeat (other device, retry) is ignored. */
export async function saveDailyResult(userId: string, r: DailyResultRow): Promise<void> {
  const { error } = await (await sb()).from('daily_game_results').insert({ user_id: userId, day: r.day, won: r.won, tries: r.tries });
  if (error && error.code !== '23505') throw error;
}
