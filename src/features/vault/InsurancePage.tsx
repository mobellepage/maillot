// /vault/insurance — the whole collection as one printable list for the
// household insurance: photo, shirt, version and size, condition, how it is
// verified and Maillot's market value, with the total. A Premium feature (the
// trial included); "Save as PDF" is the browser's print dialog.
import { useState } from 'react';
import { formatDate } from '../../lib/format.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { Button, ButtonLink, EmptyState, Page } from '../../ui/index.ts';
import { badgeFor, itemName, mainPhoto, valueOf } from './model.ts';
import { useCollection } from './useCollection.ts';
import { hasFullPlan } from '../../config/plans.ts';

export default function InsurancePage() {
  const { t, money, lang } = usePrefs();
  usePageMeta(t('ins.meta'));
  const { user, profile } = useSession();
  const { items, loading } = useCollection();
  const photoUrl = usePhotoUrls(items.map(mainPhoto), true);
  const [today] = useState(() => formatDate(new Date().toISOString(), lang));

  if (profile && !hasFullPlan(profile))
    return (
      <Page narrow>
        <EmptyState accent title={t('ins.lockedTitle')} action={<ButtonLink to="/premium">{t('plan.unlock')}</ButtonLink>}>
          {t('ins.lockedBody')}
        </EmptyState>
      </Page>
    );

  const rows = [...items].sort((a, b) => (valueOf(b) ?? 0) - (valueOf(a) ?? 0));
  const total = rows.reduce((a, c) => a + (valueOf(c) ?? 0), 0);
  const cell = { padding: '10px 8px', borderBottom: '1px solid var(--line)', verticalAlign: 'middle' as const, textAlign: 'left' as const };

  return (
    <Page>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Maillot</div>
          <h1 className="display" style={{ marginTop: 6, fontSize: 'clamp(28px,4vw,42px)' }}>
            {t('ins.title')}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 14 }}>
            {t('ins.owner', { owner: profile?.handle ? '@' + profile.handle : (user?.email ?? ''), date: today })}
          </p>
        </div>
        <Button className="no-print" onClick={() => window.print()} disabled={loading || !rows.length}>
          {t('ins.print')}
        </Button>
      </div>

      {!loading && !rows.length ? (
        <p style={{ marginTop: 24, color: 'var(--muted)' }}>{t('ins.empty')}</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 640 }}>
            <thead>
              <tr style={{ fontSize: 12, color: 'var(--muted)' }}>
                <th style={cell}>{t('ins.col.photo')}</th>
                <th style={cell}>{t('ins.col.shirt')}</th>
                <th style={cell}>{t('ins.col.details')}</th>
                <th style={cell}>{t('ins.col.condition')}</th>
                <th style={cell}>{t('ins.col.verified')}</th>
                <th style={{ ...cell, textAlign: 'right' }}>{t('ins.col.value')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const src = photoUrl(mainPhoto(c)) ?? c.kitImage ?? undefined;
                const v = valueOf(c);
                return (
                  <tr key={c.id} style={{ breakInside: 'avoid' }}>
                    <td style={cell}>
                      <span style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--sunken)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                        {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                      </span>
                    </td>
                    <td style={{ ...cell, fontWeight: 600 }}>
                      {itemName(c)}
                      <div style={{ fontWeight: 400, fontSize: 12, color: 'var(--muted)' }}>{t('ins.added', { date: formatDate(new Date(c.createdAt).toISOString(), lang) })}</div>
                    </td>
                    <td style={cell}>{[c.version, c.size, c.flock?.source !== 'Keine' ? [c.flock?.name, c.flock?.number].filter(Boolean).join(' ') : null].filter(Boolean).join(' · ') || '—'}</td>
                    <td style={cell}>{c.condition ? c.condition.grade + '/10' : '—'}</td>
                    <td style={cell}>{t(badgeFor(c).label)}</td>
                    <td className="mono" style={{ ...cell, textAlign: 'right', fontWeight: 600 }}>
                      {v !== null ? money(v) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...cell, fontWeight: 700, borderBottom: 'none' }} colSpan={5}>
                  {t('ins.total', { n: rows.length })}
                </td>
                <td className="mono" style={{ ...cell, textAlign: 'right', fontWeight: 700, fontSize: 18, borderBottom: 'none' }}>
                  {money(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{t('ins.note', { date: today })}</p>
    </Page>
  );
}
