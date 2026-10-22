// Opening a pack: five cards face down, turned one by one on a tap (or on
// their own), a rare one with a flash. Then what the pack was: new cards,
// duplicates and what they're worth. Full screen, over everything.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePrefs } from '../../lib/prefs.tsx';
import { haptic } from '../../lib/native.ts';
import type { PackCard } from '../../utils/db.ts';
import { Button } from '../../ui/index.ts';
import { GameCard } from './GameCard.tsx';
import { RARITY_COLOR, bestRarity, duplicateValue, isRarity } from './model.ts';
import { shareFantasy } from './fantasyShare.ts';
import { SITE_URL } from '../../config/site.ts';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';

const HOT = new Set(['epic', 'legendary']);

export function PackReveal({ cards, onConvert, onClose }: { cards: PackCard[]; onConvert: () => void; onClose: () => void }) {
  const { t } = usePrefs();
  const { profile } = useSession();
  const toast = useToast();
  const [shown, setShown] = useState(0);
  const share = () =>
    shareFantasy({ kicker: t('fantasy.share.pack'), title: t('fantasy.reveal.summary', { new: cards.length - cards.filter((c) => c.duplicate).length, dup: cards.filter((c) => c.duplicate).length }), cards: cards.map((c) => ({ src: c.image_path ?? undefined, tone: c.rarity, label: `${c.club_name} ${c.season}` })), handle: profile?.handle ?? null, link: SITE_URL + '/fantasy' }, t('fantasy.share.pack'))
      .then((how) => how === 'downloaded' && toast(t('fantasy.share.saved')))
      .catch(() => {});
  const all = shown >= cards.length;
  const dup = cards.filter((c) => c.duplicate).length;
  const worth = duplicateValue(cards);
  const mood = bestRarity(cards);

  // One more card every moment, unless the player taps ahead.
  useEffect(() => {
    if (all) return;
    const id = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 700 : 1100);
    return () => clearTimeout(id);
  }, [shown, all]);
  useEffect(() => {
    const c = cards[shown - 1];
    if (c && HOT.has(c.rarity)) haptic('success');
  }, [shown, cards]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className="pack-reveal" role="dialog" aria-modal="true" aria-label={t('fantasy.reveal.title')} data-mood={mood} onClick={() => !all && setShown((n) => n + 1)}>
      <div className="pack-reveal__head">
        <span className="pack-reveal__brand">Maillot · Fantasy</span>
        <span className="pack-reveal__count">
          {Math.min(shown, cards.length)}/{cards.length}
        </span>
      </div>
      <ul className="pack-reveal__cards">
        {cards.map((c, i) => {
          const up = i < shown;
          const hot = HOT.has(c.rarity);
          return (
            <li key={c.kit_id + i} className={'pack-reveal__card' + (up ? ' is-up' : '') + (up && hot ? ' is-hot' : '')} style={{ '--rc': isRarity(c.rarity) ? RARITY_COLOR[c.rarity] : RARITY_COLOR.common } as React.CSSProperties}>
              <div className="pack-reveal__back" aria-hidden="true">
                <span>M</span>
              </div>
              <div className="pack-reveal__front">
                <GameCard c={c} />
                <span className={'pack-reveal__tag' + (c.duplicate ? ' is-dup' : '')}>{c.duplicate ? t('fantasy.reveal.dup') : t('fantasy.reveal.new')}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="pack-reveal__foot">
        {all ? (
          <>
            <p className="pack-reveal__summary">{t('fantasy.reveal.summary', { new: cards.length - dup, dup })}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {worth > 0 && (
                <Button
                  variant="secondary"
                  style={{ color: '#f2f4f1', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)' }}
                  onClick={() => {
                    onConvert();
                    onClose();
                  }}
                >
                  {t('fantasy.reveal.convert', { points: worth })}
                </Button>
              )}
              <Button variant="secondary" style={{ color: '#f2f4f1', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)' }} onClick={share}>
                {t('fantasy.share.card')}
              </Button>
              <Button onClick={onClose}>{t('fantasy.reveal.done')}</Button>
            </div>
          </>
        ) : (
          <p className="pack-reveal__hint">{t('fantasy.reveal.tap')}</p>
        )}
      </div>
    </div>,
    document.body
  );
}
