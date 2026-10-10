// Marks a verified dealer (a shop selling on MAILLOT, checked by the team)
// wherever the member appears: profile, search, "sold by" on a shirt.
import { usePrefs } from '../../lib/prefs.tsx';
import { Badge } from '../../ui/index.ts';

export function DealerBadge({ compact }: { compact?: boolean }) {
  const { t } = usePrefs();
  return (
    <Badge tone="accent" title={t('dealer.hint')} style={compact ? { fontSize: 10, padding: '2px 7px' } : undefined}>
      ✓ {t('dealer.badge')}
    </Badge>
  );
}
