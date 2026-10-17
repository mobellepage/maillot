// A kit design: base colour, pattern, sleeves, collar, crest, sponsor text,
// name and number. Stored as a small JSON (kit_designs.design); everything
// read back is cleaned, so a design always draws.

export const PATTERNS = ['plain', 'stripes', 'pinstripes', 'hoops', 'halves', 'sash', 'chevron', 'centre', 'checks', 'fade'] as const;
export const COLLARS = ['crew', 'v', 'polo'] as const;
export type Pattern = (typeof PATTERNS)[number];
export type Collar = (typeof COLLARS)[number];

export interface KitDesign {
  v: 1;
  base: string;
  pattern: Pattern;
  accent: string;
  sleeves: string;
  trim: string;
  collar: Collar;
  crest: string;
  /** The club whose crest colours and short name are used, if one was picked. */
  crestClub: string;
  crestText: string;
  crestAccent: string;
  sponsor: string;
  sponsorColor: string;
  name: string;
  number: string;
  printColor: string;
}

export const DEFAULT_DESIGN: KitDesign = {
  v: 1,
  base: '#ffffff',
  pattern: 'stripes',
  accent: '#7b9769',
  sleeves: '#ffffff',
  trim: '#1b1d1a',
  collar: 'crew',
  crest: '#1b1d1a',
  crestClub: '',
  crestText: '',
  crestAccent: '#ffffff',
  sponsor: 'MAILLOT',
  sponsorColor: '#1b1d1a',
  name: '',
  number: '10',
  printColor: '#1b1d1a'
};

/** Colours to tap; any other colour comes from the picker. */
export const SWATCHES = ['#ffffff', '#1b1d1a', '#c8102e', '#e4002b', '#ff6b00', '#f7d117', '#7b9769', '#00843d', '#0b6e4f', '#6cabdd', '#004f9f', '#0a1f44', '#5b2a86', '#a50044', '#8a8d8f', '#c9a227'];

export const MAX_SPONSOR = 14;
export const MAX_NAME = 14;
export const MAX_CREST = 4;

const HEX = /^#[0-9a-f]{6}$/i;
const color = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback);
const text = (v: unknown, max: number, fallback: string) => (typeof v === 'string' ? [...v].filter((c) => c >= ' ').join('').slice(0, max) : fallback);

/** A design from anywhere (the database, a link, a draft), made safe to draw. */
export function cleanDesign(raw: unknown): KitDesign {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const D = DEFAULT_DESIGN;
  return {
    v: 1,
    base: color(d.base, D.base),
    pattern: PATTERNS.includes(d.pattern as Pattern) ? (d.pattern as Pattern) : D.pattern,
    accent: color(d.accent, D.accent),
    sleeves: color(d.sleeves, D.sleeves),
    trim: color(d.trim, D.trim),
    collar: COLLARS.includes(d.collar as Collar) ? (d.collar as Collar) : D.collar,
    crest: color(d.crest, D.crest),
    crestClub: text(d.crestClub, 60, D.crestClub).replace(/[^a-z0-9-]/g, ''),
    crestText: text(d.crestText, MAX_CREST, D.crestText).toUpperCase(),
    crestAccent: color(d.crestAccent, D.crestAccent),
    sponsor: text(d.sponsor, MAX_SPONSOR, D.sponsor),
    sponsorColor: color(d.sponsorColor, D.sponsorColor),
    name: text(d.name, MAX_NAME, D.name).toUpperCase(),
    number: text(d.number, 10, D.number).replace(/[^0-9]/g, '').slice(0, 2),
    printColor: color(d.printColor, D.printColor)
  };
}

/** A random but tidy design for "Surprise me". */
export function randomDesign(rand: () => number = Math.random): KitDesign {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  const base = pick(SWATCHES);
  let accent = pick(SWATCHES);
  while (accent === base) accent = pick(SWATCHES);
  const ink = lum(base) > 0.6 ? '#1b1d1a' : '#ffffff';
  return { ...DEFAULT_DESIGN, base, accent, pattern: pick(PATTERNS), sleeves: rand() < 0.5 ? base : accent, trim: accent, collar: pick(COLLARS), crest: ink, sponsorColor: ink, printColor: ink };
}

/** Relative brightness 0–1 of a #rrggbb colour. */
export function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

const FILLER = new Set(['fc', 'cf', 'ac', 'as', 'ss', 'sc', 'sv', 'vfb', 'vfl', 'rc', 'cd', 'ud', 'afc', 'ssc', 'us', 'ogc', 'bsc', 'fk', 'sk', 'the', 'de', 'of', 'club', 'calcio', 'football']);

/** A club's crest in the designer: its colours and a short name ("YB", "BVB", "MU"). */
export function crestFor(club: { id: string; name: string; aliases?: string[] | null; colors: string[] }): Pick<KitDesign, 'crestClub' | 'crestText' | 'crest' | 'crestAccent'> {
  const short = (club.aliases ?? []).filter((a) => /^[A-Za-z0-9]{2,4}$/.test(a)).sort((a, b) => a.length - b.length)[0];
  const words = club.name.split(/[\s.-]+/).filter(Boolean);
  const meaningful = words.filter((w) => !FILLER.has(w.toLowerCase()));
  const initials = (meaningful.length > 1 ? meaningful.map((w) => w[0]).join('') : (meaningful[0] ?? club.name).slice(0, 3)).toUpperCase();
  const [c1, c2] = club.colors.map((c) => color(c, '')).filter(Boolean);
  const main = c1 ?? DEFAULT_DESIGN.crest;
  return { crestClub: club.id, crestText: (short ?? initials).toUpperCase().slice(0, MAX_CREST), crest: main, crestAccent: c2 && c2 !== main ? c2 : lum(main) > 0.6 ? '#1b1d1a' : '#ffffff' };
}
