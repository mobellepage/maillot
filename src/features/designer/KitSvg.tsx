// Draws a kit design as SVG, front or back. Plain shapes only, so it also
// turns into a picture to save or share (share.ts).
import { forwardRef, useId } from 'react';
import type { KitDesign } from './model.ts';

const OUTLINE = '124,20 156,12 200,36 244,12 276,20 388,84 352,164 312,140 312,388 88,388 88,140 48,164 12,84';
const TORSO = '124,20 156,12 200,36 244,12 276,20 312,62 312,388 88,388 88,62';
const BACK_TORSO = '124,20 156,12 200,20 244,12 276,20 312,62 312,388 88,388 88,62';
const SLEEVE_L = '124,20 88,62 88,140 48,164 12,84';
const SLEEVE_R = '276,20 388,84 352,164 312,140 312,62';
const CUFF_L = '12,84 24,77 59,157 48,164';
const CUFF_R = '388,84 376,77 341,157 352,164';
const FONT = 'Inter, Arial, Helvetica, sans-serif';

export const KitSvg = forwardRef<SVGSVGElement, { design: KitDesign; view?: 'front' | 'back'; title?: string; className?: string }>(function KitSvg({ design: d, view = 'front', title, className }, ref) {
  const uid = 'k' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const back = view === 'back';
  const torso = back ? BACK_TORSO : TORSO;
  const sponsorSize = Math.min(40, 250 / Math.max(1, d.sponsor.length * 0.66));
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <clipPath id={uid + 't'}>
          <polygon points={torso} />
        </clipPath>
        <linearGradient id={uid + 'f'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={d.base} />
          <stop offset="1" stopColor={d.accent} />
        </linearGradient>
        <linearGradient id={uid + 's'} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.24" stopColor="#000" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.76" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <pattern id={uid + 'c'} width="56" height="56" patternUnits="userSpaceOnUse" x="88" y="12">
          <rect width="28" height="28" fill={d.accent} />
          <rect x="28" y="28" width="28" height="28" fill={d.accent} />
        </pattern>
      </defs>

      <polygon points={SLEEVE_L} fill={d.sleeves} />
      <polygon points={SLEEVE_R} fill={d.sleeves} />
      <polygon points={CUFF_L} fill={d.trim} />
      <polygon points={CUFF_R} fill={d.trim} />
      <polygon points={torso} fill={d.pattern === 'fade' ? `url(#${uid}f)` : d.base} />
      <g clipPath={`url(#${uid}t)`}>
        <PatternShapes d={d} uid={uid} />
      </g>

      {back ? (
        <path d="M156,12 Q200,30 244,12" fill="none" stroke={d.trim} strokeWidth="8" strokeLinecap="round" />
      ) : (
        <Collar d={d} />
      )}

      {!back && (
        <>
          <path d="M230,90 h36 v20 q0,19 -18,29 q-18,-10 -18,-29z" fill={d.crest} stroke={d.crestAccent} strokeWidth="2.5" />
          {d.crestText && (
            <text x="248" y={d.crestText.length > 3 ? 115 : 116} textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize={d.crestText.length > 3 ? 8.5 : d.crestText.length > 2 ? 10 : 12} fill={d.crestAccent}>
              {d.crestText}
            </text>
          )}
          {d.sponsor && (
            <text x="200" y="214" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize={sponsorSize} letterSpacing="1" fill={d.sponsorColor}>
              {d.sponsor}
            </text>
          )}
        </>
      )}
      {back && (
        <>
          {d.name && (
            <text x="200" y="104" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize={Math.min(28, 210 / Math.max(1, d.name.length * 0.7))} letterSpacing="3" fill={d.printColor}>
              {d.name}
            </text>
          )}
          {d.number && (
            <text x="200" y="272" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="150" letterSpacing="-4" fill={d.printColor}>
              {d.number}
            </text>
          )}
        </>
      )}

      <polygon points={OUTLINE} fill={`url(#${uid}s)`} />
      <polygon points={OUTLINE} fill="none" stroke="#000" strokeOpacity="0.14" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
});

function PatternShapes({ d, uid }: { d: KitDesign; uid: string }) {
  const a = d.accent;
  switch (d.pattern) {
    case 'stripes':
      return (
        <>
          {[70, 110, 150, 190, 230, 270, 310].map((x) => (
            <rect key={x} x={x} y="0" width="20" height="400" fill={a} />
          ))}
        </>
      );
    case 'pinstripes':
      return (
        <>
          {Array.from({ length: 14 }, (_, i) => 84 + i * 18).map((x) => (
            <rect key={x} x={x} y="0" width="3" height="400" fill={a} />
          ))}
        </>
      );
    case 'hoops':
      return (
        <>
          {[44, 100, 156, 212, 268, 324].map((y) => (
            <rect key={y} x="0" y={y} width="400" height="28" fill={a} />
          ))}
        </>
      );
    case 'halves':
      return <rect x="200" y="0" width="200" height="400" fill={a} />;
    case 'sash':
      return <polygon points="60,70 112,20 340,330 288,392" fill={a} />;
    case 'chevron':
      return <polygon points="80,96 200,176 320,96 320,142 200,222 80,142" fill={a} />;
    case 'centre':
      return <rect x="166" y="0" width="68" height="400" fill={a} />;
    case 'checks':
      return <rect x="0" y="0" width="400" height="400" fill={`url(#${uid}c)`} />;
    default:
      return null;
  }
}

function Collar({ d }: { d: KitDesign }) {
  if (d.collar === 'v')
    return (
      <>
        <polygon points="156,12 200,58 244,12 200,24" fill="#000" fillOpacity="0.28" />
        <path d="M156,12 L200,62 L244,12" fill="none" stroke={d.trim} strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" />
      </>
    );
  if (d.collar === 'polo')
    return (
      <>
        <rect x="193" y="36" width="14" height="58" rx="3" fill={d.trim} />
        <circle cx="200" cy="56" r="2.6" fill={d.base} />
        <circle cx="200" cy="76" r="2.6" fill={d.base} />
        <polygon points="148,10 200,36 186,66 136,30" fill={d.trim} />
        <polygon points="252,10 200,36 214,66 264,30" fill={d.trim} />
      </>
    );
  return (
    <>
      <path d="M156,12 Q200,50 244,12 Q200,28 156,12z" fill="#000" fillOpacity="0.28" />
      <path d="M156,12 Q200,56 244,12" fill="none" stroke={d.trim} strokeWidth="10" strokeLinecap="round" />
    </>
  );
}
