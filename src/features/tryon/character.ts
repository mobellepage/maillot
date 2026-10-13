// The try-on character: what it looks like, its outfit, and the geometry the
// figure is drawn from. Pure, so it's unit-tested; Figure.tsx draws it.

export const SKIN = ['#F7DDC9', '#EFC7A6', '#E2AE88', '#C98F66', '#A8714C', '#8A5636', '#6B3F27', '#4A2A1A'] as const;
export const HAIR_COLORS = ['#1B1714', '#3B2A20', '#6B4A2E', '#A87A45', '#D9B472', '#B5502E', '#8E8E8E', '#E8E4DE'] as const;
export const CLOTH_COLORS = ['#1F2A44', '#2F4A7A', '#5B7BB2', '#1D1D1F', '#4A4A4A', '#9A9A9A', '#F2F2EE', '#C7B28E', '#6B5A3E', '#3E5B3A', '#7A2E2E', '#E3262E'] as const;

export const GENDERS = ['m', 'f'] as const;
export const BUILDS = ['slim', 'regular', 'athletic', 'broad'] as const;
export const HAIRS = ['bald', 'buzz', 'short', 'fade', 'curly', 'afro', 'mohawk', 'long', 'bun', 'ponytail', 'braids'] as const;
export const BEARDS = ['none', 'stubble', 'moustache', 'goatee', 'full'] as const;
export const PANTS = ['jeans', 'chinos', 'joggers', 'cargo', 'shorts'] as const;
export const SHOES = ['sneakers', 'runners', 'boots', 'loafers', 'slides'] as const;
export const FITS = ['regular', 'oversized'] as const;
export const HEIGHT = { min: 150, max: 205 } as const;

export interface Character {
  gender: (typeof GENDERS)[number];
  height: number;
  build: (typeof BUILDS)[number];
  skin: number;
  hair: (typeof HAIRS)[number];
  hairColor: number;
  beard: (typeof BEARDS)[number];
  glasses: boolean;
  pants: (typeof PANTS)[number];
  pantsColor: number;
  shoes: (typeof SHOES)[number];
  shoesColor: number;
  fit: (typeof FITS)[number];
  /** Catalogue shirt id being tried on. */
  jersey: string | null;
}

export interface Look {
  /** outfit + jersey, saved to compare later */
  pants: Character['pants'];
  pantsColor: number;
  shoes: Character['shoes'];
  shoesColor: number;
  fit: Character['fit'];
  jersey: string;
}

export const DEFAULT_CHARACTER: Character = {
  gender: 'm',
  height: 180,
  build: 'regular',
  skin: 2,
  hair: 'short',
  hairColor: 1,
  beard: 'none',
  glasses: false,
  pants: 'jeans',
  pantsColor: 1,
  shoes: 'sneakers',
  shoesColor: 6,
  fit: 'regular',
  jersey: null
};

const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const idx = (v: unknown, len: number, fallback: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < len ? (v as number) : fallback);

/** Anything stored (browser or profile) back into a valid character. */
export function sanitizeCharacter(raw: unknown): Character {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_CHARACTER;
  const h = typeof r.height === 'number' && Number.isFinite(r.height) ? Math.round(Math.min(HEIGHT.max, Math.max(HEIGHT.min, r.height))) : d.height;
  return {
    gender: pick(r.gender, GENDERS, d.gender),
    height: h,
    build: pick(r.build, BUILDS, d.build),
    skin: idx(r.skin, SKIN.length, d.skin),
    hair: pick(r.hair, HAIRS, d.hair),
    hairColor: idx(r.hairColor, HAIR_COLORS.length, d.hairColor),
    beard: pick(r.beard, BEARDS, d.beard),
    glasses: r.glasses === true,
    pants: pick(r.pants, PANTS, d.pants),
    pantsColor: idx(r.pantsColor, CLOTH_COLORS.length, d.pantsColor),
    shoes: pick(r.shoes, SHOES, d.shoes),
    shoesColor: idx(r.shoesColor, CLOTH_COLORS.length, d.shoesColor),
    fit: pick(r.fit, FITS, d.fit),
    jersey: typeof r.jersey === 'string' && /^[a-z0-9-]{1,40}$/.test(r.jersey) ? r.jersey : null
  };
}

export function sanitizeLooks(raw: unknown): Look[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l) => {
      const c = sanitizeCharacter(l);
      return c.jersey ? { pants: c.pants, pantsColor: c.pantsColor, shoes: c.shoes, shoesColor: c.shoesColor, fit: c.fit, jersey: c.jersey } : null;
    })
    .filter((l): l is Look => !!l)
    .slice(0, MAX_LOOKS);
}
export const MAX_LOOKS = 12;

// ---------------------------------------------------------------------------
// Geometry, in a 200 × 480 stage with the floor at y = 468.
// ---------------------------------------------------------------------------
export const STAGE = { w: 200, h: 480, floor: 468, cx: 100 } as const;

const BUILD = {
  slim: { sh: 0.92, w: 0.86, limb: 0.86 },
  regular: { sh: 1, w: 1, limb: 1 },
  athletic: { sh: 1.12, w: 0.96, limb: 1.12 },
  broad: { sh: 1.12, w: 1.28, limb: 1.22 }
} as const;

export type Pt = readonly [number, number];

export interface Geometry {
  T: number;
  top: number;
  hh: number;
  head: { cx: number; cy: number; rx: number; ry: number };
  neck: { top: number; bottom: number; half: number };
  shoulderY: number;
  sw: number;
  waistY: number;
  hipY: number;
  crotchY: number;
  kneeY: number;
  ankleY: number;
  ww: number;
  hw: number;
  au: number;
  lt: number;
  /** left arm (x mirrored for the right): shoulder, elbow, wrist */
  arm: { shoulder: Pt; elbow: Pt; wrist: Pt };
}

/** Figure height in stage units: 150 cm → 300, 205 cm → 410 (headroom for big hair). */
export const figureHeight = (cm: number) => 300 + ((Math.min(HEIGHT.max, Math.max(HEIGHT.min, cm)) - HEIGHT.min) / (HEIGHT.max - HEIGHT.min)) * 110;

export function geometry(c: Pick<Character, 'height' | 'build' | 'gender'>): Geometry {
  const { cx, floor } = STAGE;
  const T = figureHeight(c.height);
  const top = floor - T;
  const hh = T / 7.4;
  const b = BUILD[c.build];
  const f = c.gender === 'f';
  const shoulderY = top + hh * 1.3;
  const sw = T * 0.115 * b.sh * (f ? 0.9 : 1);
  const au = T * 0.022 * b.limb * (f ? 0.9 : 1);
  return {
    T,
    top,
    hh,
    head: { cx, cy: top + hh * 0.5, rx: hh * 0.39, ry: hh * 0.5 },
    neck: { top: top + hh * 0.85, bottom: top + hh * 1.22, half: hh * (f ? 0.14 : 0.17) * (0.9 + b.limb * 0.1) },
    shoulderY,
    sw,
    waistY: top + hh * 3.0,
    hipY: top + hh * 3.6,
    crotchY: top + hh * 4.05,
    kneeY: top + hh * 5.6,
    ankleY: floor - T * 0.035,
    ww: T * 0.085 * b.w * (f ? 0.86 : 1),
    hw: T * 0.095 * b.w * (f ? 1.16 : 1),
    au,
    lt: T * 0.034 * b.limb * (f ? 1.05 : 1),
    arm: {
      shoulder: [cx - sw + au * 0.55, shoulderY + au * 0.7],
      elbow: [cx - sw - T * 0.012, top + hh * 2.55],
      wrist: [cx - sw - T * 0.02, top + hh * 3.75]
    }
  };
}

/** Mirror a left-side point to the right. */
export const mirror = ([x, y]: Pt): Pt => [2 * STAGE.cx - x, y];

/** The jersey outline (torso + short sleeves), clockwise from the left collar. */
export function jerseyOutline(g: Geometry, fit: Character['fit'], gender: Character['gender']): { all: Pt[]; torso: Pt[]; collar: { y: number; half: number }; hemY: number } {
  const { cx } = STAGE;
  const F = fit === 'oversized' ? 1.12 : 1;
  const long = fit === 'oversized' ? 1.7 : 1;
  const fem = gender === 'f';
  const neckW = g.neck.half * 1.45;
  const collarY = g.neck.bottom - g.hh * 0.06;
  const sh: Pt = [cx - (g.sw + 2) * F, g.shoulderY - g.hh * 0.02];
  // Short sleeve: from the shoulder along the upper arm, a little wider than it.
  const [ex, ey] = g.arm.elbow;
  const [sx, sy] = g.arm.shoulder;
  const t = fit === 'oversized' ? 0.62 : 0.5;
  const sleeveMid: Pt = [sx + (ex - sx) * t, sy + (ey - sy) * t];
  const sleeveOut: Pt = [sleeveMid[0] - g.au * 1.25 * F, sleeveMid[1]];
  const sleeveIn: Pt = [sleeveMid[0] + g.au * 1.15 * F, sleeveMid[1] + g.hh * 0.05];
  const armpit: Pt = [cx - (g.sw - g.au * 1.5) * F, g.shoulderY + g.hh * 0.72];
  const waist: Pt = [cx - Math.max(g.ww * (fem && fit === 'regular' ? 1.04 : 1.1), g.sw * 0.66) * F, g.waistY];
  const hem: Pt = [cx - Math.max(g.hw, g.ww) * 1.06 * F, g.hipY + g.hh * 0.18 * long];
  const hemMid: Pt = [cx, hem[1] + g.hh * 0.05];
  const left: Pt[] = [[cx - neckW, collarY], sh, sleeveOut, sleeveIn, armpit, waist, hem];
  const leftTorso: Pt[] = [[cx - neckW, collarY], [sh[0] + g.au * 0.4, sh[1] + g.hh * 0.06], armpit, waist, hem];
  const right = (pts: Pt[]) => pts.map(mirror).reverse();
  // Round neckline back from the right collar point to the left one.
  const dip: Pt[] = [
    [cx + neckW * 0.55, collarY + g.hh * 0.14],
    [cx, collarY + g.hh * 0.2],
    [cx - neckW * 0.55, collarY + g.hh * 0.14]
  ];
  return {
    all: [...left, hemMid, ...right(left), ...dip],
    torso: [...leftTorso, hemMid, ...right(leftTorso), ...dip],
    collar: { y: collarY, half: neckW },
    hemY: hem[1]
  };
}

export function bbox(pts: readonly Pt[]) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** CSS clip-path polygon for points, relative to a box. */
export function clipPolygon(pts: readonly Pt[], box: { x: number; y: number; w: number; h: number }): string {
  const pct = (v: number) => Math.round(v * 1000) / 10 + '%';
  return 'polygon(' + pts.map(([x, y]) => `${pct((x - box.x) / box.w)} ${pct((y - box.y) / box.h)}`).join(',') + ')';
}
