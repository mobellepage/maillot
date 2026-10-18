// Before the first photo: is the shirt just for the collection, or for sale?
// The collection needs front and back only (offers still possible); a sale
// is walked through every photo buyers need for the authenticity check.
import { usePrefs } from '../../../lib/prefs.tsx';
import type { AddGoal } from './useAddShirtForm.ts';

const GOALS: { key: AddGoal; icon: string }[] = [
  { key: 'collection', icon: '👕' },
  { key: 'sale', icon: '🏷️' }
];

export function GoalStep({ goal, onPick }: { goal: AddGoal | null; onPick: (g: AddGoal) => void }) {
  const { t } = usePrefs();
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>{t('as.goal.q')}</legend>
      <div style={{ display: 'grid', gap: 10 }}>
        {GOALS.map((g) => (
          <button key={g.key} type="button" className="option-btn" aria-pressed={goal === g.key} onClick={() => onPick(g.key)} style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start', textAlign: 'left' }}>
            <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>
              {g.icon}
            </span>
            <span>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 15.5 }}>{t('as.goal.' + g.key)}</span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.45 }}>{t('as.goal.' + g.key + '.desc')}</span>
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
