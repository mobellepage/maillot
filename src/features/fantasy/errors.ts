// What the game's error codes mean to the manager (the RPCs raise them).
import { FANTASY } from '../../config/fantasy.ts';

export function errorText(t: (k: string, v?: Record<string, string | number>) => string, code?: string): string {
  switch (code) {
    case 'P0470':
      return t('fantasy.md.err.deadline');
    case 'P0471':
      return t('fantasy.sq.err.size', { n: FANTASY.squadSize });
    case 'P0472':
      return t('fantasy.md.err.captain');
    case 'P0473':
      return t('fantasy.sq.err.pickable');
    case 'P0474':
      return t('fantasy.md.err.budget');
    case 'P0475':
      return t('fantasy.md.err.chip');
    case 'P0476':
      return t('fantasy.sq.err.chipLocked');
    case 'P0477':
      return t('fantasy.sq.err.league', { n: FANTASY.maxPerLeague, league: '' });
    case 'P0478':
      return t('fantasy.sq.err.national');
    case 'P0479':
      return t('fantasy.sq.err.noSquad');
    default:
      return t('fantasy.md.err.failed');
  }
}
