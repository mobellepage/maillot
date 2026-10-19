// The member's plan at a glance (collection header, add-shirt scan step):
// the trial's days left, the free scans of this month, or Premium.
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import { daysLeft, usePlan } from './usePlan.ts';

export function PlanChip({ style }: { style?: CSSProperties }) {
  const { t } = usePrefs();
  const plan = usePlan();
  if (!plan) return null;
  const base: CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 12, display: 'inline-flex', ...style };
  if (plan.plan === 'premium')
    return (
      <Link to="/premium" className="badge badge--accent" style={base}>
        Premium
      </Link>
    );
  const label = plan.plan === 'trial' ? t('plan.chipTrial', { n: daysLeft(plan.trialUntil) }) : t('plan.chipFree', { n: Math.max(0, plan.scansLimit - plan.scansUsed), max: plan.scansLimit });
  return (
    <Link to="/premium" className={'badge ' + (plan.plan === 'trial' ? 'badge--accent' : 'badge--neutral')} style={base}>
      {label}
    </Link>
  );
}
