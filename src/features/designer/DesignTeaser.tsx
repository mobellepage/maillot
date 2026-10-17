// Discover: an invitation to the kit designer, with a few designs turning.
import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import { ButtonLink } from '../../ui/index.ts';
import { KitSvg } from './KitSvg.tsx';
import { DEFAULT_DESIGN, type KitDesign } from './model.ts';

const SHOWCASE: KitDesign[] = [
  { ...DEFAULT_DESIGN, base: '#0a1f44', pattern: 'sash', accent: '#c9a227', sleeves: '#0a1f44', trim: '#c9a227', collar: 'v', crest: '#c9a227', sponsor: 'MAILLOT', sponsorColor: '#ffffff' },
  { ...DEFAULT_DESIGN },
  { ...DEFAULT_DESIGN, base: '#c8102e', pattern: 'hoops', accent: '#ffffff', sleeves: '#c8102e', trim: '#ffffff', collar: 'polo', crest: '#ffffff', sponsor: 'BERN', sponsorColor: '#1b1d1a' }
];

export function DesignTeaser() {
  const { t } = usePrefs();
  return (
    <section aria-labelledby="des-teaser" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(32px,4vw,56px) var(--gutter) 0' }}>
      <div className="card design-teaser">
        <div style={{ minWidth: 0 }}>
          <h2 id="des-teaser" className="title" style={{ margin: 0 }}>
            🎨 {t('des.teaserTitle')}
          </h2>
          <p style={{ margin: '6px 0 14px', color: 'var(--text-2)', fontSize: 14.5, lineHeight: 1.5 }}>{t('des.teaserBody')}</p>
          <ButtonLink to="/designer" size="sm">
            {t('des.start')}
          </ButtonLink>
        </div>
        <Link to="/designer" className="design-teaser-kits" aria-hidden="true" tabIndex={-1}>
          {SHOWCASE.map((d, i) => (
            <KitSvg key={i} design={d} />
          ))}
        </Link>
      </div>
    </section>
  );
}
