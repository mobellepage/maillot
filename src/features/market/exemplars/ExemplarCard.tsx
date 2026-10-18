// One shirt in someone's collection, on the marketplace: the owner's photo,
// version, size, condition, verification, owner and status — with what a
// visitor can do: buy or offer (for sale), offer (open to offers), ask
// anyway (a collector's piece), watch the model. Demo shirts say so and
// can't be bought.
import { Link } from 'react-router';
import { BY } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { useSession } from '../../../lib/session.tsx';
import { Badge, HEX, ShirtGraphic, WatchButton, alpha } from '../../../ui/index.ts';
import { OfferButton } from '../../collectors/OfferButton.tsx';
import { InquiryButton } from '../../collectors/InquiryButton.tsx';
import { isCutoutPath } from '../../vault/addshirt/studio.ts';
import { PendingPhotos } from '../../vault/PendingPhotos.tsx';
import { useWatchlist } from '../../watchlist/useWatchlist.ts';
import { canTrade, estimate, type Exemplar } from './model.ts';

const VERIFY_TONE = { expert: 'accent', precheck: 'info', self: 'neutral' } as const;

export function ExemplarCard({ e, src }: { e: Exemplar; src: string | undefined }) {
  const { t, money } = usePrefs();
  const { profile } = useSession();
  const watch = useWatchlist();
  const cat = e.catalogId ? BY[e.catalogId] : undefined;
  const mine = !!profile?.handle && profile.handle === e.owner;
  const est = estimate(e);
  const trade = canTrade(e) && !mine;
  const to = e.demo ? (cat ? '/shirt/' + cat.id : '/market') : '/u/' + e.owner + '/' + encodeURIComponent(e.id);
  const path = e.photo?.path;
  const condition = e.grade !== null ? t('mx.grade', { n: e.grade }) : null;
  const statusLabel = e.status === 'forsale' ? t('mx.status.forsale') : e.status === 'offers' ? t('mx.status.offers') : t('mx.status.public');

  return (
    <li className="card card--interactive" style={{ padding: 0, borderRadius: 20, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ aspectRatio: '1/1', display: 'grid', placeItems: 'center', position: 'relative', background: src && !isCutoutPath(path) ? 'var(--sunken)' : `radial-gradient(circle at 50% 46%,${alpha(cat ? cat.glow : HEX.muted, 0.3)},rgba(0,0,0,0) 62%),var(--sunken)` }}>
        {src ? (
          isCutoutPath(path) ? (
            <img src={src} alt="" loading="lazy" decoding="async" className="shirt-photo" style={{ width: '86%', height: '86%', objectFit: 'contain' }} />
          ) : (
            <img src={src} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )
        ) : e.kitImage ? (
          <PendingPhotos src={e.kitImage} />
        ) : (
          <ShirtGraphic pat={cat?.pat ?? HEX.placeholderPat} trim={cat?.trim ?? HEX.muted} crest={cat?.crest ?? HEX.muted} photo={cat?.photo} style={{ width: '64%' }} />
        )}
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {e.demo && <Badge title={t('mx.demoTitle')}>DEMO</Badge>}
            <Badge tone={VERIFY_TONE[e.verification]}>{t('mx.verify.' + e.verification)}</Badge>
          </span>
          {cat && (
            <span style={{ position: 'relative', zIndex: 2 }}>
              <WatchButton watched={watch.has(cat.id)} onToggle={() => watch.toggle(cat.id)} name={cat.name} size={34} />
            </span>
          )}
        </div>
      </div>
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <Link to={to} className="stretched-link" style={{ color: 'var(--text)', fontWeight: 650, fontSize: 14.5, lineHeight: 1.25 }}>
          {e.name || t('coll.untitled')}
        </Link>
        <div className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>
          {[t('mx.version.' + (e.version ?? 'replica')), e.size && t('coll.size', { size: e.size }), condition, e.print].filter(Boolean).join(' · ')}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>@{e.owner}</div>

        <div style={{ marginTop: 'auto', paddingTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone={e.status === 'public' ? 'neutral' : 'accent'}>{e.status === 'public' ? t('mx.piece') : statusLabel}</Badge>
            <span style={{ textAlign: 'right' }}>
              <span className="mono" style={{ display: 'block', fontWeight: 700, fontSize: 16 }}>
                {e.status === 'forsale' && e.price !== null ? money(e.price) : est.value !== null ? money(est.value) : '—'}
              </span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)' }}>
                {e.status === 'forsale' && e.price !== null ? t('mx.price') : est.afterExpert ? t('mx.afterExpert') : est.value !== null ? t('mx.estimate') : t('mx.noValue')}
              </span>
            </span>
          </div>
          {mine ? (
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>{t('mx.yours')}</p>
          ) : e.demo ? (
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>{t('mx.demoNote')}</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {trade && e.status === 'forsale' && e.price !== null && <OfferButton itemId={e.id} name={e.name} owner={e.owner} suggested={e.price} label={t('mx.buy')} primary />}
              {trade && (e.status === 'forsale' || e.status === 'offers') && <OfferButton itemId={e.id} name={e.name} owner={e.owner} suggested={est.value ?? undefined} />}
              {e.status === 'public' && e.canAsk && <InquiryButton itemId={e.id} name={e.name} owner={e.owner} />}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
