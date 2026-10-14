// The try-on figure: body, face, hair, trousers and shoes as SVG; the jersey
// as clipped layers in the shirt's own colours (the same pattern the
// catalogue draws), with the real photo on the torso when the shirt has one.
import { stretch, usePhotoInfo, type PhotoInfo } from './photoInfo.ts';
import {
  CLOTH_COLORS,
  HAIR_COLORS,
  SKIN,
  STAGE,
  bbox,
  clipPolygon,
  geometry,
  jerseyOutline,
  mirror,
  type Character,
  type Geometry,
  type Pt
} from './character.ts';

const SHADE =
  'linear-gradient(90deg,rgba(0,0,0,0.26),rgba(0,0,0,0) 22%,rgba(255,255,255,0.08) 50%,rgba(0,0,0,0) 78%,rgba(0,0,0,0.26)),linear-gradient(180deg,rgba(255,255,255,0.1),rgba(0,0,0,0.18))';
const pts = (p: readonly Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

/** What the figure wears: a shirt's colours and, when there is one, its photo. */
export interface Wear {
  pat: string;
  trim: string;
  crest: string;
  photoUrl?: string | undefined;
}

/** Where the shirt usually sits in a catalogue photo, until the photo has been measured. */
const DEFAULT_BOX: PhotoInfo['box'] = { l: 0.17, t: 0.09, r: 0.83, b: 0.87 };

export function Figure({ c, shirt, label }: { c: Character; shirt: Wear | null; label: string }) {
  const info = usePhotoInfo(shirt?.photoUrl);
  const g = geometry(c);
  const skin = SKIN[c.skin]!;
  const hair = HAIR_COLORS[c.hairColor]!;
  const pants = CLOTH_COLORS[c.pantsColor]!;
  const shoes = CLOTH_COLORS[c.shoesColor]!;
  const j = jerseyOutline(g, c.fit, c.gender);
  const box = bbox(j.all);
  const pos = (b: { x: number; y: number; w: number; h: number }) => ({
    left: (b.x / STAGE.w) * 100 + '%',
    top: (b.y / STAGE.h) * 100 + '%',
    width: (b.w / STAGE.w) * 100 + '%',
    height: (b.h / STAGE.h) * 100 + '%'
  });

  return (
    <div role="img" aria-label={label} style={{ position: 'relative', width: '100%', aspectRatio: `${STAGE.w} / ${STAGE.h}` }}>
      <svg viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
        <Ruler c={c} g={g} />
        <ellipse cx={STAGE.cx} cy={STAGE.floor + 2} rx={g.hw * 1.6} ry={5} fill="rgba(0,0,0,0.12)" />
        <HairBack c={c} g={g} color={hair} />
        {/* neck, arms, torso and legs */}
        <rect x={STAGE.cx - g.neck.half} y={g.neck.top} width={g.neck.half * 2} height={g.neck.bottom - g.neck.top + g.hh * 0.2} fill={shade(skin, 0.93)} />
        {[g.arm, { shoulder: mirror(g.arm.shoulder), elbow: mirror(g.arm.elbow), wrist: mirror(g.arm.wrist) }].map((a, i) => (
          <g key={i}>
            <polyline points={pts([a.shoulder, a.elbow, a.wrist])} fill="none" stroke={skin} strokeWidth={g.au * 2} strokeLinecap="round" strokeLinejoin="round" />
            <ellipse cx={a.wrist[0]} cy={a.wrist[1] + g.au * 0.9} rx={g.au * 0.95} ry={g.au * 1.25} fill={shade(skin, 0.97)} />
          </g>
        ))}
        <polygon points={pts([[STAGE.cx - g.sw + g.au, g.shoulderY], [STAGE.cx + g.sw - g.au, g.shoulderY], [STAGE.cx + g.hw, g.hipY], [STAGE.cx - g.hw, g.hipY]])} fill={skin} />
        <Legs c={c} g={g} skin={skin} />
        <Trousers c={c} g={g} color={pants} />
        <Shoes c={c} g={g} color={shoes} skin={skin} />
      </svg>

      {shirt ? (
        <>
          <div style={{ position: 'absolute', ...pos(box), clipPath: clipPolygon(j.all, box), background: shirt.photoUrl ? (info?.base ?? shirt.pat) : shirt.pat }} />
          {shirt.photoUrl && (
            // The photo stretched so the shirt in it fills the whole jersey, sleeves included.
            <div style={{ position: 'absolute', ...pos(box), clipPath: clipPolygon(j.all, box), backgroundImage: `url(${shirt.photoUrl})`, backgroundRepeat: 'no-repeat', ...stretch(info?.box ?? DEFAULT_BOX) }} />
          )}
          <div style={{ position: 'absolute', ...pos(box), clipPath: clipPolygon(j.all, box), background: SHADE, opacity: shirt.photoUrl ? 0.55 : 1 }} />
        </>
      ) : (
        // No jersey picked yet: a plain white tee.
        <div style={{ position: 'absolute', ...pos(box), clipPath: clipPolygon(j.all, box), background: 'linear-gradient(180deg,#F4F4F1,#DCDCD8)' }} />
      )}

      <svg viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden="true">
        {shirt && <JerseyDetails g={g} shirt={shirt} collar={j.collar} />}
        <Head c={c} g={g} skin={skin} hair={hair} />
      </svg>
    </div>
  );
}

function JerseyDetails({ g, shirt, collar }: { g: Geometry; shirt: Wear; collar: { y: number; half: number } }) {
  const { cx } = STAGE;
  const d = `M ${cx - collar.half} ${collar.y} Q ${cx - collar.half * 0.5} ${collar.y + g.hh * 0.2} ${cx} ${collar.y + g.hh * 0.21} Q ${cx + collar.half * 0.5} ${collar.y + g.hh * 0.2} ${cx + collar.half} ${collar.y}`;
  const crestSize = g.hh * 0.2;
  // A photo brings its own collar, crest and maker logo.
  if (shirt.photoUrl) return null;
  return (
    <g>
      <path d={d} fill="none" stroke={shirt.trim} strokeWidth={g.hh * 0.05} strokeLinecap="round" />
      {(
        <>
          <rect x={cx + g.sw * 0.32} y={g.shoulderY + g.hh * 0.35} width={crestSize * 0.85} height={crestSize} rx={crestSize * 0.25} fill={shirt.crest} />
          <rect x={cx - g.sw * 0.32 - crestSize * 0.8} y={g.shoulderY + g.hh * 0.42} width={crestSize * 0.8} height={crestSize * 0.36} rx={1.5} fill={shirt.trim} opacity={0.85} />
        </>
      )}
    </g>
  );
}

function Ruler({ c, g }: { c: Character; g: Geometry }) {
  const perCm = g.T / c.height;
  const ticks = [150, 160, 170, 180, 190, 200];
  return (
    <g fontFamily="var(--font-mono)" fontSize="7" fill="var(--muted)">
      {ticks.map((cm) => {
        const y = STAGE.floor - cm * perCm;
        return (
          <g key={cm}>
            <line x1={4} x2={14} y1={y} y2={y} stroke="var(--line-strong)" strokeWidth={0.8} />
            <text x={16} y={y + 2.4}>
              {cm}
            </text>
          </g>
        );
      })}
      <line x1={4} x2={196} y1={g.top} y2={g.top} stroke="var(--accent)" strokeWidth={0.8} strokeDasharray="3 3" />
      <text x={196} y={g.top - 3} textAnchor="end" fill="var(--accent)" fontWeight={700}>
        {(c.height / 100).toFixed(2)} m
      </text>
    </g>
  );
}

function legLine(g: Geometry, side: -1 | 1): { hip: Pt; knee: Pt; ankle: Pt } {
  const { cx } = STAGE;
  // Legs a little apart, so trousers show two legs.
  const off = Math.max(g.hw * 0.55, g.lt * 1.3);
  return {
    hip: [cx + side * off, g.hipY],
    knee: [cx + side * off * 0.95, g.kneeY],
    ankle: [cx + side * off * 0.9, g.ankleY]
  };
}

function Legs({ c, g, skin }: { c: Character; g: Geometry; skin: string }) {
  const w = g.lt * (c.gender === 'f' ? 1.85 : 2);
  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const l = legLine(g, s);
        return <polyline key={s} points={pts([l.hip, l.knee, l.ankle])} fill="none" stroke={skin} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </g>
  );
}

function Trousers({ c, g, color }: { c: Character; g: Geometry; color: string }) {
  const { cx } = STAGE;
  const shorts = c.pants === 'shorts';
  const kneeW = g.lt * ({ jeans: 1.05, chinos: 1.12, joggers: 1.12, cargo: 1.28, shorts: 1.35 } as const)[c.pants];
  const ankleW = g.lt * ({ jeans: 0.95, chinos: 1.0, joggers: 0.78, cargo: 1.08, shorts: 1.35 } as const)[c.pants];
  const endY = shorts ? g.kneeY - g.hh * 0.18 : g.ankleY - 1;
  const top = g.hipY - g.hh * 0.18;
  const side = (s: -1 | 1) => {
    const l = legLine(g, s);
    const t = (endY - l.hip[1]) / (l.ankle[1] - l.hip[1]);
    const endX = shorts ? l.hip[0] + (l.knee[0] - l.hip[0]) * t : l.ankle[0];
    const kneeX = l.knee[0];
    const out: Pt[] = [[cx + s * g.hw * 1.03, top]];
    if (!shorts) out.push([kneeX + s * kneeW, g.kneeY]);
    out.push([endX + s * (shorts ? kneeW : ankleW), endY], [endX - s * (shorts ? kneeW : ankleW), endY]);
    if (!shorts) out.push([kneeX - s * kneeW, g.kneeY]);
    return { out, endX };
  };
  const L = side(-1);
  const R = side(1);
  const poly: Pt[] = [...L.out, [cx, g.crotchY], ...R.out.slice().reverse()];
  const dark = shade(color, 0.75);
  const light = shade(color, 1.18);
  return (
    <g>
      <polygon points={pts(poly)} fill={color} />
      <rect x={cx - g.hw * 1.03} y={top} width={g.hw * 2.06} height={g.hh * 0.12} fill={dark} />
      {c.pants === 'jeans' && (
        <g stroke={light} strokeWidth={0.8} fill="none" opacity={0.7}>
          <line x1={cx} y1={top + g.hh * 0.12} x2={cx} y2={g.crotchY - 2} />
          <path d={`M ${cx - g.hw * 0.9} ${top + g.hh * 0.14} q ${g.hw * 0.25} ${g.hh * 0.22} ${g.hw * 0.5} ${g.hh * 0.05}`} />
          <path d={`M ${cx + g.hw * 0.9} ${top + g.hh * 0.14} q ${-g.hw * 0.25} ${g.hh * 0.22} ${-g.hw * 0.5} ${g.hh * 0.05}`} />
        </g>
      )}
      {c.pants === 'chinos' &&
        ([-1, 1] as const).map((s) => {
          const l = legLine(g, s);
          return <line key={s} x1={l.hip[0]} y1={g.crotchY} x2={l.ankle[0]} y2={g.ankleY - 3} stroke={light} strokeWidth={0.7} opacity={0.6} />;
        })}
      {c.pants === 'cargo' &&
        ([-1, 1] as const).map((s) => (
          <rect key={s} x={cx + s * g.hw * 1.05 - (s > 0 ? g.lt * 1.1 : 0)} y={g.crotchY + g.hh * 0.45} width={g.lt * 1.1} height={g.hh * 0.55} rx={2} fill={dark} />
        ))}
      {c.pants === 'joggers' && (
        <>
          {([L.endX, R.endX] as const).map((x, i) => (
            <rect key={i} x={x - ankleW} y={endY - g.hh * 0.14} width={ankleW * 2} height={g.hh * 0.14} rx={2} fill={dark} />
          ))}
          <path d={`M ${cx - 3} ${top + g.hh * 0.1} l -2 ${g.hh * 0.3} M ${cx + 3} ${top + g.hh * 0.1} l 2 ${g.hh * 0.3}`} stroke="#F2F2EE" strokeWidth={0.9} />
        </>
      )}
      {shorts && ([L.endX, R.endX] as const).map((x, i) => <line key={i} x1={x - kneeW} x2={x + kneeW} y1={endY - 1.5} y2={endY - 1.5} stroke={dark} strokeWidth={1.5} />)}
    </g>
  );
}

function Shoes({ c, g, color, skin }: { c: Character; g: Geometry; color: string; skin: string }) {
  const h = g.T * 0.045;
  const w = g.lt * 1.35;
  const floor = STAGE.floor;
  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const x = legLine(g, s).ankle[0] + s * w * 0.12;
        const body = `M ${x - w} ${floor} L ${x - w} ${floor - h * 0.55} Q ${x - w} ${floor - h} ${x - w * 0.4} ${floor - h} L ${x + w * 0.4} ${floor - h} Q ${x + w} ${floor - h} ${x + w} ${floor - h * 0.55} L ${x + w} ${floor} Z`;
        if (c.shoes === 'slides')
          return (
            <g key={s}>
              <ellipse cx={x} cy={floor - h * 0.45} rx={w * 0.8} ry={h * 0.5} fill={skin} />
              <rect x={x - w * 1.05} y={floor - h * 0.22} width={w * 2.1} height={h * 0.22} rx={2} fill={shade(color, 0.7)} />
              <rect x={x - w * 0.95} y={floor - h * 0.75} width={w * 1.9} height={h * 0.32} rx={3} fill={color} />
            </g>
          );
        if (c.shoes === 'boots')
          return (
            <g key={s}>
              <rect x={x - w * 0.95} y={floor - h * 2.1} width={w * 1.9} height={h * 2.1} rx={w * 0.4} fill={color} />
              <rect x={x - w} y={floor - h * 0.25} width={w * 2} height={h * 0.25} fill="#2A2420" />
              <line x1={x} x2={x} y1={floor - h * 1.9} y2={floor - h * 0.5} stroke={shade(color, 0.7)} strokeWidth={1} />
            </g>
          );
        return (
          <g key={s}>
            <path d={body} fill={c.shoes === 'loafers' ? shade(color, 0.85) : color} />
            {c.shoes !== 'loafers' && <rect x={x - w} y={floor - h * 0.3} width={w * 2} height={h * 0.3} fill="#F7F7F4" />}
            {c.shoes === 'loafers' && <rect x={x - w} y={floor - h * 0.15} width={w * 2} height={h * 0.15} fill="#2A2420" />}
            {c.shoes === 'sneakers' && <path d={`M ${x - w * 0.35} ${floor - h * 0.85} h ${w * 0.7} M ${x - w * 0.35} ${floor - h * 0.65} h ${w * 0.7}`} stroke="#F7F7F4" strokeWidth={0.8} />}
            {c.shoes === 'runners' && <path d={`M ${x - w * 0.8} ${floor - h * 0.45} q ${w * 0.8} ${-h * 0.5} ${w * 1.6} ${-h * 0.2}`} stroke={shade(color, 1.45)} strokeWidth={1.4} fill="none" />}
          </g>
        );
      })}
    </g>
  );
}

function HairBack({ c, g, color }: { c: Character; g: Geometry; color: string }) {
  const { cx, cy, rx, ry } = g.head;
  if (c.hair === 'afro') return <circle cx={cx} cy={cy - ry * 0.3} r={rx * 1.55} fill={color} />;
  if (c.hair === 'long')
    return <path d={`M ${cx - rx * 1.12} ${cy - ry * 0.4} L ${cx - rx * 1.25} ${g.shoulderY + g.hh * 0.45} Q ${cx} ${g.shoulderY + g.hh * 0.7} ${cx + rx * 1.25} ${g.shoulderY + g.hh * 0.45} L ${cx + rx * 1.12} ${cy - ry * 0.4} Z`} fill={color} />;
  if (c.hair === 'ponytail') return <path d={`M ${cx + rx * 0.6} ${cy - ry * 0.6} Q ${cx + rx * 1.7} ${cy} ${cx + rx * 1.1} ${cy + ry * 1.5} Q ${cx + rx * 1.0} ${cy + ry * 0.5} ${cx + rx * 0.4} ${cy - ry * 0.3} Z`} fill={color} />;
  if (c.hair === 'braids')
    return (
      <g stroke={color} strokeWidth={g.hh * 0.07} strokeLinecap="round">
        {[-1.05, -0.8, 0.8, 1.05].map((k) => (
          <line key={k} x1={cx + rx * k} y1={cy - ry * 0.3} x2={cx + rx * k * 1.08} y2={g.shoulderY + g.hh * 0.55} />
        ))}
      </g>
    );
  return null;
}

function Head({ c, g, skin, hair }: { c: Character; g: Geometry; skin: string; hair: string }) {
  const { cx, cy, rx, ry } = g.head;
  const eyeY = cy + ry * 0.04;
  const eyeX = rx * 0.38;
  const cap = (fringe: number, side = 1.04) =>
    `M ${cx - rx * side} ${cy - ry * 0.05} C ${cx - rx * 1.12} ${cy - ry * 1.3} ${cx + rx * 1.12} ${cy - ry * 1.3} ${cx + rx * side} ${cy - ry * 0.05} C ${cx + rx * 0.82} ${cy - ry * fringe} ${cx - rx * 0.82} ${cy - ry * fringe} ${cx - rx * side} ${cy - ry * 0.05} Z`;
  const jaw = `M ${cx - rx * 0.96} ${cy + ry * 0.02} Q ${cx - rx * 0.95} ${cy + ry * 0.9} ${cx} ${cy + ry * 1.04} Q ${cx + rx * 0.95} ${cy + ry * 0.9} ${cx + rx * 0.96} ${cy + ry * 0.02} Q ${cx + rx * 0.6} ${cy + ry * 0.62} ${cx} ${cy + ry * 0.6} Q ${cx - rx * 0.6} ${cy + ry * 0.62} ${cx - rx * 0.96} ${cy + ry * 0.02} Z`;
  const moustache = `M ${cx - rx * 0.36} ${cy + ry * 0.5} Q ${cx} ${cy + ry * 0.36} ${cx + rx * 0.36} ${cy + ry * 0.5} Q ${cx} ${cy + ry * 0.44} ${cx - rx * 0.36} ${cy + ry * 0.5} Z`;
  return (
    <g>
      <ellipse cx={cx - rx * 0.98} cy={eyeY + ry * 0.08} rx={rx * 0.14} ry={ry * 0.2} fill={shade(skin, 0.94)} />
      <ellipse cx={cx + rx * 0.98} cy={eyeY + ry * 0.08} rx={rx * 0.14} ry={ry * 0.2} fill={shade(skin, 0.94)} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={skin} />
      {/* facial hair */}
      {c.beard === 'stubble' && <path d={jaw} fill={hair} opacity={0.28} />}
      {c.beard === 'full' && <path d={jaw} fill={hair} opacity={0.95} />}
      {c.beard === 'goatee' && <ellipse cx={cx} cy={cy + ry * 0.82} rx={rx * 0.26} ry={ry * 0.2} fill={hair} />}
      {(c.beard === 'moustache' || c.beard === 'goatee' || c.beard === 'full') && <path d={moustache} fill={hair} />}
      {/* eyes, brows, nose, mouth */}
      <circle cx={cx - eyeX} cy={eyeY} r={rx * 0.09} fill="#2A1E18" />
      <circle cx={cx + eyeX} cy={eyeY} r={rx * 0.09} fill="#2A1E18" />
      <path d={`M ${cx - eyeX - rx * 0.16} ${eyeY - ry * 0.2} q ${rx * 0.16} ${-ry * 0.07} ${rx * 0.32} 0 M ${cx + eyeX - rx * 0.16} ${eyeY - ry * 0.2} q ${rx * 0.16} ${-ry * 0.07} ${rx * 0.32} 0`} stroke={c.hair === 'bald' ? shade(skin, 0.6) : hair} strokeWidth={rx * 0.07} fill="none" strokeLinecap="round" />
      <path d={`M ${cx} ${eyeY + ry * 0.08} q ${-rx * 0.08} ${ry * 0.2} ${rx * 0.04} ${ry * 0.24}`} stroke={shade(skin, 0.75)} strokeWidth={rx * 0.05} fill="none" strokeLinecap="round" />
      <path d={`M ${cx - rx * 0.22} ${cy + ry * 0.58} q ${rx * 0.22} ${ry * 0.12} ${rx * 0.44} 0`} stroke={c.beard === 'full' ? shade(skin, 0.9) : c.gender === 'f' ? '#B4555A' : shade(skin, 0.6)} strokeWidth={rx * (c.gender === 'f' ? 0.09 : 0.06)} fill="none" strokeLinecap="round" />
      {/* hair on top */}
      {c.hair === 'buzz' && <path d={cap(0.62, 1.0)} fill={hair} opacity={0.75} />}
      {(c.hair === 'short' || c.hair === 'long' || c.hair === 'braids') && <path d={cap(0.5)} fill={hair} />}
      {c.hair === 'fade' && (
        <>
          <path d={cap(0.62, 1.01)} fill={hair} opacity={0.35} />
          <path d={cap(0.55, 0.78)} fill={hair} />
        </>
      )}
      {c.hair === 'curly' && (
        <>
          <path d={cap(0.55)} fill={hair} />
          {[-0.8, -0.45, -0.1, 0.25, 0.6, 0.9].map((k, i) => (
            <circle key={i} cx={cx + rx * k} cy={cy - ry * (0.85 + (i % 2) * 0.12)} r={rx * 0.24} fill={hair} />
          ))}
        </>
      )}
      {c.hair === 'afro' && <path d={cap(0.55, 1.08)} fill={hair} />}
      {c.hair === 'mohawk' && (
        <>
          <path d={cap(0.62, 0.98)} fill={hair} opacity={0.3} />
          <ellipse cx={cx} cy={cy - ry * 0.95} rx={rx * 0.22} ry={ry * 0.42} fill={hair} />
        </>
      )}
      {(c.hair === 'bun' || c.hair === 'ponytail') && <path d={cap(0.45)} fill={hair} />}
      {c.hair === 'bun' && <circle cx={cx} cy={cy - ry * 1.18} r={rx * 0.36} fill={hair} />}
      {c.glasses && (
        <g fill="none" stroke="#1D1D1F" strokeWidth={rx * 0.07}>
          <circle cx={cx - eyeX} cy={eyeY} r={rx * 0.26} />
          <circle cx={cx + eyeX} cy={eyeY} r={rx * 0.26} />
          <path d={`M ${cx - eyeX + rx * 0.26} ${eyeY} h ${eyeX * 2 - rx * 0.52}`} />
        </g>
      )}
    </g>
  );
}
