// A member's profile picture: their chosen legend (legends.ts), drawn as SVG,
// or their initials on the default gradient when they haven't picked one.
import { useId, type CSSProperties } from 'react';
import { LEGEND_BY_ID, type Legend } from './legends.ts';

const JERSEY = 'M6 64C6 52 15 46.5 24 44.5L32 50.5L40 44.5C49 46.5 58 52 58 64Z';
const BEHIND: Partial<Record<Legend['hair'], string>> = {
  afro: 'M32 6C45 6 50 15 49 26C48.5 33 45 37 42 38L22 38C19 37 15.5 33 15 26C14 15 19 6 32 6Z',
  long: 'M20.5 26C20 14 44 14 43.5 26L45.5 45L38 43L26 43L18.5 45Z',
  mullet: 'M21.5 25L20 42L27 40L26.5 30ZM42.5 25L44 42L37 40L37.5 30Z',
  bun: 'M32 4.5A5.5 5.5 0 1 1 32 15.5A5.5 5.5 0 1 1 32 4.5Z',
  ponytail: 'M40 15C47 15 49 22 47 30C46 34 44 37 42.5 39L41 24Z',
  dreads: 'M20.5 20h3.2v22h-3.2zM24.5 21h3.2v19h-3.2zM36.3 21h3.2v19h-3.2zM40.3 20h3.2v22h-3.2z'
};
const FRONT: Partial<Record<Legend['hair'], string>> = {
  short: 'M21.6 25.5C21.5 15.5 27.5 13 32 13C36.5 13 42.5 15.5 42.4 25.5C40.5 20.5 36.5 18.5 32 18.5C27.5 18.5 23.5 20.5 21.6 25.5Z',
  buzz: 'M22.3 23.5C22.8 16.5 27.5 14.6 32 14.6C36.5 14.6 41.2 16.5 41.7 23.5C38.5 19.8 25.5 19.8 22.3 23.5Z',
  long: 'M21.6 26C21.5 15.5 27.5 13 32 13C36.5 13 42.5 15.5 42.4 26C40 21 37 18.5 32 18.5C27 18.5 24 21 21.6 26Z',
  mullet: 'M21.6 25.5C21.5 15.5 27.5 13 32 13C36.5 13 42.5 15.5 42.4 25.5C40.5 20.5 36.5 18.5 32 18.5C27.5 18.5 23.5 20.5 21.6 25.5Z',
  ponytail: 'M21.8 24.5C22 16 27 13.5 32 13.5C37 13.5 42 16 42.2 24.5C39.5 19.5 36 18 32 18C28 18 24.5 19.5 21.8 24.5Z',
  bun: 'M21.8 24.5C22 16 27 13.5 32 13.5C37 13.5 42 16 42.2 24.5C39.5 19.5 36 18 32 18C28 18 24.5 19.5 21.8 24.5Z',
  dreads: 'M21.6 25.5C21.5 15.5 27.5 13 32 13C36.5 13 42.5 15.5 42.4 25.5C40.5 20.5 36.5 18.5 32 18.5C27.5 18.5 23.5 20.5 21.6 25.5Z',
  sidepart: 'M21.6 25.5C20.8 15.5 29 12 35 13C40.5 14 43.2 18.5 42.4 25.5C40.5 20.5 35.5 19 30.5 17C27 19 23.5 21.5 21.6 25.5Z',
  quiff: 'M21.8 24C22 16 26 11 33 10.5C39 10 43 14 42.2 24C40 19 36 17.8 32 18C28 18.2 24.5 19.5 21.8 24Z',
  mohawk: 'M29 8.5C30 7.5 34 7.5 35 8.5L35.5 20L28.5 20Z',
  bald: 'M21.8 27C21.6 23.5 22.3 21.5 23.6 21L24 28.5ZM42.2 27C42.4 23.5 41.7 21.5 40.4 21L40 28.5Z'
};
const CURLS: [number, number, number][] = [[23, 21, 4], [26.5, 16, 4.2], [32, 13.8, 4.4], [37.5, 16, 4.2], [41, 21, 4], [29, 18.5, 3.5], [35, 18.5, 3.5]];
const FACE: Record<Exclude<Legend['face'], 'none'>, { d: string; opacity?: number }[]> = {
  moustache: [{ d: 'M27.3 33C28.8 31.4 31 31.8 32 32.9C33 31.8 35.2 31.4 36.7 33C35.2 34.5 33.2 34.1 32 33.6C30.8 34.1 28.8 34.5 27.3 33Z' }],
  beard: [{ d: 'M22.2 28.5C22.6 37.5 27 40.6 32 40.6C37 40.6 41.4 37.5 41.8 28.5C40.2 33.6 37 35.4 32 35.4C27 35.4 23.8 33.6 22.2 28.5Z' }, { d: 'M27.3 33C28.8 31.4 31 31.8 32 32.9C33 31.8 35.2 31.4 36.7 33C35.2 34.5 33.2 34.1 32 33.6C30.8 34.1 28.8 34.5 27.3 33Z' }],
  stubble: [{ d: 'M22.2 28.5C22.6 37.5 27 40.6 32 40.6C37 40.6 41.4 37.5 41.8 28.5C40.2 33.6 37 35.4 32 35.4C27 35.4 23.8 33.6 22.2 28.5Z', opacity: 0.3 }],
  goatee: [{ d: 'M29.2 35.6C29.6 39 30.8 40.4 32 40.4C33.2 40.4 34.4 39 34.8 35.6C33.8 36.4 30.2 36.4 29.2 35.6Z' }, { d: 'M27.3 33C28.8 31.4 31 31.8 32 32.9C33 31.8 35.2 31.4 36.7 33C35.2 34.5 33.2 34.1 32 33.6C30.8 34.1 28.8 34.5 27.3 33Z' }]
};

/** Black or white, whichever reads on this kit colour. */
const ink = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? '#1D1D1F' : '#FFFFFF';
};

function Pattern({ l }: { l: Legend }) {
  const c = l.trim;
  switch (l.pattern) {
    case 'stripes':
      return <>{[10, 22, 34, 46].map((x) => <rect key={x} x={x} y={40} width={6} height={26} fill={c} />)}</>;
    case 'pinstripes':
      return <>{[12, 18, 24, 30, 36, 42, 48].map((x) => <rect key={x} x={x} y={40} width={1.2} height={26} fill={c} opacity={0.8} />)}</>;
    case 'hoops':
      return <>{[52, 59].map((y) => <rect key={y} x={0} y={y} width={64} height={4} fill={c} />)}</>;
    case 'halves':
      return <rect x={32} y={40} width={32} height={26} fill={c} />;
    case 'sash':
      return <path d="M14 46L22 44L50 66L40 66Z" fill={c} />;
    case 'chest':
      return <rect x={0} y={54} width={64} height={4} fill={c} />;
    default:
      return null;
  }
}

function LegendArt({ l }: { l: Legend }) {
  const clip = useId();
  const behind = BEHIND[l.hair];
  const front = FRONT[l.hair];
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" style={{ display: 'block' }}>
      <rect width="64" height="64" fill={l.bg} />
      {behind && <path d={behind} fill={l.hairColor} />}
      <clipPath id={clip}>
        <path d={JERSEY} />
      </clipPath>
      <path d={JERSEY} fill={l.kit} />
      <g clipPath={`url(#${clip})`}>
        <Pattern l={l} />
      </g>
      <path d="M26.5 36H37.5V47L32 50.5L26.5 47Z" fill={l.skin} />
      <path d="M24 44.5L32 50.5L40 44.5" fill="none" stroke={l.trim} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="21.8" cy="28" r="2.6" fill={l.skin} />
      <circle cx="42.2" cy="28" r="2.6" fill={l.skin} />
      <ellipse cx="32" cy="27" rx="10.2" ry="12" fill={l.skin} />
      {l.hair === 'curls' && CURLS.map(([x, y, r]) => <circle key={x + '-' + y} cx={x} cy={y} r={r} fill={l.hairColor} />)}
      {l.hair === 'afro' && <path d="M21.8 25C21 17 26 14 32 14C38 14 43 17 42.2 25C39 20.5 25 20.5 21.8 25Z" fill={l.hairColor} />}
      {front && <path d={front} fill={l.hairColor} />}
      {l.headband && <rect x="21.5" y="19.5" width="21" height="3.2" rx="1.6" fill={l.headband} />}
      <ellipse cx="28" cy="28" rx="1.2" ry="1.5" fill="#1D1D1F" />
      <ellipse cx="36" cy="28" rx="1.2" ry="1.5" fill="#1D1D1F" />
      {l.face !== 'none' && FACE[l.face].map((p) => <path key={p.d} d={p.d} fill={l.hairColor} opacity={p.opacity ?? 1} />)}
      <text x="32" y="61.5" textAnchor="middle" fontSize="7" fontWeight="800" fontFamily="var(--font-sans)" fill={ink(l.kit)} stroke={l.kit} strokeWidth="1.4" paintOrder="stroke">
        {l.num}
      </text>
    </svg>
  );
}

export function Avatar({ avatar, name, size = 40, ring = true, style }: { avatar?: string | null | undefined; name: string; size?: number; ring?: boolean; style?: CSSProperties }) {
  const legend = avatar ? LEGEND_BY_ID[avatar] : undefined;
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flex: 'none', display: 'grid', placeItems: 'center', border: ring ? '2px solid var(--accent)' : undefined, background: legend ? legend.bg : 'var(--avatar-grad)', color: 'var(--text)', fontWeight: 800, fontSize: Math.round(size * 0.32), ...style }}
    >
      {legend ? <LegendArt l={legend} /> : name.replace(/^@/, '').slice(0, 2).toUpperCase()}
    </span>
  );
}

export { LegendArt };
