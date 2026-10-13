// /demo/partner — a private preview of a partner shop on Maillot, built from
// public/demo/partner.json (scripts/partner-demo.mjs). Development builds
// only: the route is not part of production, and the data (the partner's
// photos and texts) is git-ignored. Plain German copy on purpose: it is a
// pitch screen, not part of the app's translated UI.
import { useEffect, useMemo, useState } from 'react';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Badge, Button, Card, EmptyState, Page, SearchField, StatTile } from '../../ui/index.ts';

interface DemoShirt {
  id: string;
  title: string;
  club: string | null;
  season: string | null;
  kit: string | null;
  size: string | null;
  brand: string | null;
  player: string | null;
  grade: number | null;
  condition: string | null;
  signed: boolean;
  price: number;
  images: string[];
  url: string;
  studio?: string;
}
interface Demo {
  shop: string;
  domain: string;
  fetchedAt: string;
  totalProducts: number;
  medianPrice: number;
  shirts: DemoShirt[];
}

const KITS = ['Heim', 'Auswärts', 'Drittes', 'Torhüter', 'Training'];
const PAGE = 48;
const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH');
const name = (s: DemoShirt) => [s.club, s.season, s.kit].filter(Boolean).join(' · ') || s.title;

function DemoCard({ s, studioLook }: { s: DemoShirt; studioLook: boolean }) {
  const studio = studioLook && s.studio;
  return (
    <li className="card card--interactive" style={{ padding: 0, borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
      <div style={{ aspectRatio: '1/1', position: 'relative', background: studio ? '#0A0C0B' : '#F4F4F2', display: 'grid', placeItems: 'center' }}>
        <img src={studio || s.images[0]} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: studio ? 'cover' : 'contain' }} />
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          {s.signed ? <Badge tone="accent">Signiert</Badge> : <span />}
          {s.grade !== null && <Badge tone="neutral">{s.grade}/10</Badge>}
        </div>
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {[s.brand, s.size && 'Grösse ' + s.size].filter(Boolean).join(' · ')}
        </div>
        <a href={s.url} target="_blank" rel="noreferrer" className="stretched-link" style={{ display: 'block', color: 'var(--text)', fontWeight: 600, fontSize: 14.5, lineHeight: 1.25, marginTop: 5, height: '2.5em', overflow: 'hidden' }}>
          {name(s)}
        </a>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 6, marginTop: 6 }}>
          <span className="mono" style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', flex: 'none' }}>
            {chf(s.price)}
          </span>
          {s.player && <span style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{s.player}</span>}
        </div>
      </div>
    </li>
  );
}

export default function PartnerDemoPage() {
  usePrefs();
  const [demo, setDemo] = useState<Demo | null | 'missing'>(null);
  const [q, setQ] = useState('');
  const [kit, setKit] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [studioLook, setStudioLook] = useState(true);
  usePageMeta('Partner-Demo', 'Private Vorschau');

  useEffect(() => {
    fetch('/demo/partner.json')
      .then((r) => (r.ok ? r.json() : 'missing'))
      .then(setDemo, () => setDemo('missing'));
  }, []);

  const shirts = useMemo(() => (demo && demo !== 'missing' ? demo.shirts : []), [demo]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return shirts.filter((s) => (!kit || s.kit === kit) && (!needle || s.title.toLowerCase().includes(needle)));
  }, [shirts, q, kit]);

  if (demo === null) return <Page />;
  if (demo === 'missing')
    return (
      <Page narrow>
        <EmptyState title="Keine Demo-Daten">
          Zuerst <code>node scripts/partner-demo.mjs &lt;shop-domain&gt; "&lt;Name&gt;" 36</code> ausführen.
        </EmptyState>
      </Page>
    );

  const studioShirts = shirts.filter((s) => s.studio);
  const caps = demo.shop.match(/[A-Z]/g) ?? [demo.shop[0] ?? '?'];
  const initials = (caps.length > 1 ? caps[0]! + caps[caps.length - 1] : demo.shop.slice(0, 2)).toUpperCase();
  return (
    <Page>
      <div className="mono" style={{ fontSize: 11.5, color: 'var(--warn)', background: 'var(--warn-soft)', borderRadius: 10, padding: '8px 12px', marginBottom: 24 }}>
        Private Demo · nur lokal · Fotos und Texte © {demo.shop} · Stand {new Date(demo.fetchedAt).toLocaleDateString('de-CH')}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div aria-hidden="true" style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid var(--accent)', padding: 4, flex: 'none' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--avatar-grad)', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 800 }}>{initials}</div>
        </div>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <Badge tone="accent">✓ Verifizierter Händler</Badge>
          <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,44px)', margin: '8px 0 0' }}>
            {demo.shop}
          </h1>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6 }}>Pilot-Partner · Schweiz · Second-Hand & Retro</div>
        </div>
        <Button size="sm">Folgen</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginTop: 28 }}>
        <StatTile highlight label="Trikots an Lager" value={shirts.length.toLocaleString('de-CH')} />
        <StatTile label="Preis (Median)" value={chf(demo.medianPrice)} />
        <StatTile label="Mit Spielerflock" value={shirts.filter((s) => s.player).length.toLocaleString('de-CH')} />
        <StatTile label="Signiert" value={shirts.filter((s) => s.signed).length} />
      </div>

      {studioShirts.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 className="title" style={{ margin: 0 }}>
              Neu eingetroffen
            </h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={studioLook} onChange={(e) => setStudioLook(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
              Maillot Studio-Look
            </label>
          </div>
          <ul className="grid-cards" style={{ listStyle: 'none', padding: 0, margin: '14px 0 0' }}>
            {studioShirts.slice(0, 12).map((s) => (
              <DemoCard key={s.id} s={s} studioLook={studioLook} />
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginTop: 40 }}>
        <h2 className="title">
          Alle Trikots <span className="mono" style={{ color: 'var(--muted)', fontSize: 13 }}>{filtered.length.toLocaleString('de-CH')}</span>
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '12px 0 16px' }}>
          <SearchField srLabel="Trikots suchen" placeholder="Verein, Spieler, Saison…" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} style={{ flex: '1 1 220px', maxWidth: 340 }} />
          {KITS.map((k) => (
            <button key={k} type="button" className={'chip' + (kit === k ? ' chip--active' : '')} aria-pressed={kit === k} onClick={() => { setKit(kit === k ? null : k); setShown(PAGE); }}>
              {k}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <Card>Keine Trikots gefunden.</Card>
        ) : (
          <ul className="grid-cards" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {filtered.slice(0, shown).map((s) => (
              <DemoCard key={s.id} s={s} studioLook={studioLook} />
            ))}
          </ul>
        )}
        {shown < filtered.length && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Button variant="secondary" onClick={() => setShown(shown + PAGE)}>
              Mehr laden ({(filtered.length - shown).toLocaleString('de-CH')} weitere)
            </Button>
          </div>
        )}
      </section>
    </Page>
  );
}
