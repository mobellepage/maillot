// The promise as three tiles: capture with a photo, show your collection to
// friends, and hear when a shirt you want turns up.
import { Link } from 'react-router';
import { BY } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { ButtonLink, HeartIcon, ShirtGraphic } from '../../ui/index.ts';
import { SITE_URL } from '../../config/site.ts';
import { Avatar } from '../avatars/Avatar.tsx';

function Thumb({ id, size = 64, bg = 'var(--sunken)' }: { id: string; size?: number; bg?: string }) {
  const s = BY[id];
  if (!s) return null;
  return (
    <span style={{ width: size, height: size, borderRadius: 14, overflow: 'hidden', display: 'grid', placeItems: 'center', background: bg, flex: 'none' }}>
      <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} photo={s.photo} flat style={{ width: '78%' }} />
    </span>
  );
}

const tile = { borderRadius: 26, padding: 'clamp(24px,3vw,36px)', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 300, position: 'relative', overflow: 'hidden' } as const;
const kicker = { fontSize: 14, fontWeight: 600 } as const;
const big = { margin: 0, fontSize: 'clamp(26px,3.2vw,38px)', lineHeight: 1.08, fontWeight: 700, letterSpacing: '-0.02em' } as const;
const body = { margin: 0, fontSize: 15.5, lineHeight: 1.5, color: 'var(--text-2)', maxWidth: 420 } as const;

export function HomeBento() {
  const { t } = usePrefs();
  const { profile } = useSession();
  const handle = profile?.handle ?? t('home.bento.show.sampleHandle');

  return (
    <section aria-labelledby="bento-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(40px,5vw,72px) var(--gutter) 0' }}>
      <h2 id="bento-title" className="sr-only">
        {t('home.how.title')}
      </h2>
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,290px),1fr))' }}>
        {/* 1 — capture: dark, like the camera */}
        <div style={{ ...tile, background: '#0A0C0B', color: '#F2F4F1', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ ...kicker, color: '#4BFF8B' }}>{t('home.bento.scan.kicker')}</span>
          <p style={{ ...big, color: '#F2F4F1' }}>{t('home.bento.scan.title')}</p>
          <p style={{ ...body, color: '#C9D0CB' }}>{t('home.bento.scan.body')}</p>
          {/* Green on the dark tile in either theme. */}
          <ButtonLink to="/vault/add" size="sm" style={{ marginTop: 6, background: '#4BFF8B', color: '#06110A' }}>
            {t('home.bento.scan.cta')}
          </ButtonLink>
          <div aria-hidden="true" style={{ position: 'relative', width: 'min(240px,70%)', aspectRatio: '1/1', marginTop: 14, borderRadius: 22, background: '#141816', display: 'grid', placeItems: 'center' }}>
            {(['0 auto auto 0', '0 0 auto auto', 'auto auto 0 0', 'auto 0 0 auto'] as const).map((inset, i) => (
              <span key={i} style={{ position: 'absolute', inset, margin: 12, width: 24, height: 24, borderColor: '#4BFF8B', borderStyle: 'solid', borderWidth: `${i < 2 ? 3 : 0}px ${i % 2 ? 3 : 0}px ${i >= 2 ? 3 : 0}px ${i % 2 ? 0 : 3}px`, borderRadius: 4 }} />
            ))}
            <span style={{ width: '72%' }}>
              <Thumb id="juv-9697" size={150} bg="transparent" />
            </span>
            <span className="mono" style={{ position: 'absolute', bottom: 14, fontSize: 11.5, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', color: '#F2F4F1' }}>
              Juventus 1996/97 · 96 %
            </span>
          </div>
        </div>

        {/* 2 — show your friends */}
        <div style={{ ...tile, background: 'var(--surface)' }}>
          <span style={{ ...kicker, color: 'var(--accent)' }}>{t('home.bento.show.kicker')}</span>
          <p style={big}>{t('home.bento.show.title')}</p>
          <p style={body}>{t('home.bento.show.body')}</p>
          <div aria-hidden="true" style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar avatar={profile ? profile.avatar : 'legend-01'} name={handle} size={48} />
            <span>
              <span style={{ display: 'block', fontWeight: 700 }}>@{handle}</span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)' }}>{SITE_URL.replace(/^https?:\/\//, '')}/u/{handle}</span>
            </span>
          </div>
          <Link to={profile?.handle ? '/u/' + profile.handle : '/vault/add'} style={{ fontWeight: 600, marginTop: 8 }}>
            {profile?.handle ? t('home.bento.show.ctaMine') : t('home.bento.show.cta')} ›
          </Link>
        </div>

        {/* 3 — wanted shirt shows up */}
        <div style={{ ...tile, background: 'var(--surface)' }}>
          <span style={{ ...kicker, color: 'var(--accent)' }}>{t('home.bento.wanted.kicker')}</span>
          <p style={big}>{t('home.bento.wanted.title')}</p>
          <p style={body}>{t('home.bento.wanted.body')}</p>
          <div aria-hidden="true" style={{ marginTop: 'auto', paddingTop: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 14, borderRadius: 18, background: 'var(--elevated)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
              <Thumb id="ned-88" size={52} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  <HeartIcon size={13} filled style={{ color: 'var(--accent)' }} /> {t('notif.wanted.title')}
                </span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{t('home.bento.wanted.sample')}</span>
              </span>
            </div>
          </div>
          <Link to="/feed" style={{ fontWeight: 600, marginTop: 8 }}>
            {t('home.bento.wanted.cta')} ›
          </Link>
        </div>
      </div>
    </section>
  );
}
