// On a shirt for sale or open to offers that is still "self-reported": the
// photos the pre-check needs (badge, inner label, print), added right here.
// Once they are all there, the pre-check runs on its own and, if all is
// well, the shirt — and its listing on the marketplace — becomes
// "pre-checked".
import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { missingSalePhotos } from '../../addShirtData.js';
import { BY } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import type { CustomItem } from '../../types/domain.ts';
import * as db from '../../utils/db.ts';
import { Button } from '../../ui/index.ts';
import { PhotoSlots } from './AddOwnPhotos.tsx';
import { precheck, withAiCheck } from './addshirt/precheck.ts';
import { CHECK_PHOTOS } from './addshirt/useAddShirtForm.ts';

export function PrecheckPrompt({ item }: { item: CustomItem }) {
  const { t, lang } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const missing = missingSalePhotos(item.photos, item.flock?.source) as string[];
  const run = useMutation({
    mutationFn: async () => {
      const photos = CHECK_PHOTOS.flatMap(([key, kind]) => (item.photos[key]?.path ? [{ kind, path: item.photos[key]!.path! }] : []));
      const name = item.catalogId ? (BY[item.catalogId]?.name ?? null) : [item.proposedClub, item.proposedSeason, item.proposedVariant].filter(Boolean).join(' ') || null;
      const flock = item.flock ?? { source: 'Keine' };
      const claim = { shirt: name, version: item.version || null, print: flock.source !== 'Keine' ? [flock.name, flock.number].filter(Boolean).join(' ') || null : null, patches: item.patches ?? [] };
      const r = await db.checkAuthenticity(photos, claim, lang).catch(() => null);
      qc.invalidateQueries({ queryKey: ['my-plan'] });
      // This month's free scans are used: nothing to save, the member decides.
      if (r && !r.ok && r.reason === 'quota') return 'quota' as const;
      const local = precheck({ photos: item.photos, scan: { status: 'idle', confidence: 0, matchId: null, result: null }, catalogId: item.catalogId, version: item.version ?? '', proposed: item.proposed });
      const p = withAiCheck(local, r && r.ok ? r.result : null);
      const level = p.status === 'ok' ? 'precheck' : item.verification.level;
      await db.upsertCustomItem(user!.id, { ...item, precheck: p, verification: { ...item.verification, level }, updatedAt: Date.now() });
      return level;
    },
    onSuccess: (level) => {
      qc.invalidateQueries({ queryKey: ['customItems', user?.id] });
      qc.invalidateQueries({ queryKey: ['marketExemplars'] });
      toast(t(level === 'quota' ? 'plan.quotaCheck' : level === 'precheck' ? 'vp.done' : 'vp.review'));
    },
    onError: () => toast(t('toast.actionFailed'))
  });
  // The last photo in: the pre-check starts by itself.
  const was = useRef(missing.length);
  useEffect(() => {
    if (was.current > 0 && missing.length === 0 && !run.isPending) run.mutate();
    was.current = missing.length;
  }, [missing.length, run]);

  if (!user || item.verification.level !== 'self' || (item.visibility !== 'forsale' && item.visibility !== 'offers')) return null;
  return (
    <section aria-labelledby="vp-title" className="card" style={{ padding: 16, borderRadius: 18, marginTop: 16 }}>
      <h2 id="vp-title" style={{ margin: 0, fontSize: 16 }}>
        {t('vp.title')}
      </h2>
      <p style={{ margin: '4px 0 12px', fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.45 }}>{t('vp.body')}</p>
      {missing.length > 0 ? (
        <PhotoSlots item={item} keys={missing} />
      ) : (
        <Button size="sm" busy={run.isPending} busyLabel={t('as.pc.checking')} onClick={() => run.mutate()}>
          {t('vp.start')}
        </Button>
      )}
    </section>
  );
}
