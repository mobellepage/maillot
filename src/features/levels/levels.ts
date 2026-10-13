// Which collector level a collection has reached and how far the next one
// is. Pure, so it's unit-tested; the thresholds live in config/rules.ts.
import { COLLECTOR_LEVELS } from '../../config/rules.ts';

export type Level = (typeof COLLECTOR_LEVELS)[number];

export interface LevelState {
  /** The level reached (null: no shirt yet). */
  level: Level | null;
  /** 1-based position of the level (0 before the first shirt). */
  rank: number;
  next: Level | null;
  /** 0..1 towards the next level, by whichever path (shirts or value) is further along. */
  progress: number;
  /** What's still missing for the next level on each path. */
  shirtsToGo: number;
  valueToGo: number;
}

const reached = (l: Level, shirts: number, value: number) => shirts >= l.shirts || (l.value > 0 && value >= l.value);

export function levelFor(shirts: number, value: number): LevelState {
  let rank = 0;
  COLLECTOR_LEVELS.forEach((l, i) => {
    if (reached(l, shirts, value)) rank = i + 1;
  });
  const level = rank ? COLLECTOR_LEVELS[rank - 1]! : null;
  const next = COLLECTOR_LEVELS[rank] ?? null;
  if (!next) return { level, rank, next: null, progress: 1, shirtsToGo: 0, valueToGo: 0 };
  const from = level ?? { shirts: 0, value: 0 };
  const part = (have: number, a: number, b: number) => (b > a ? Math.min(1, Math.max(0, (have - a) / (b - a))) : 0);
  const progress = Math.max(part(shirts, from.shirts, next.shirts), next.value ? part(value, from.value, next.value) : 0);
  return { level, rank, next, progress, shirtsToGo: Math.max(0, next.shirts - shirts), valueToGo: next.value ? Math.max(0, Math.ceil(next.value - value)) : 0 };
}
