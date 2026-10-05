// Design tokens. The single source of truth for colour, type, radius and
// spacing; the values live as CSS custom properties in ui/ui.css so plain CSS
// classes and inline styles share them. Components reference `T.*` (which
// resolve to var(--…)) — never raw hex values.

export const T = {
  // Surfaces
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  sunken: 'var(--sunken)',
  elevated: 'var(--elevated)',
  overlay: 'var(--overlay)',
  scrim: 'var(--scrim)',
  // Lines
  line: 'var(--line)',
  lineStrong: 'var(--line-strong)',
  // Text
  text: 'var(--text)',
  text2: 'var(--text-2)',
  muted: 'var(--muted)',
  faint: 'var(--faint)',
  // Brand & status
  accent: 'var(--accent)',
  accentInk: 'var(--accent-ink)',
  accentSoft: 'var(--accent-soft)',
  accentLine: 'var(--accent-line)',
  neg: 'var(--neg)',
  negSoft: 'var(--neg-soft)',
  warn: 'var(--warn)',
  warnSoft: 'var(--warn-soft)',
  info: 'var(--info)',
  infoSoft: 'var(--info-soft)',
  // Type
  sans: 'var(--font-sans)',
  mono: 'var(--font-mono)',
  // Radius
  rSm: 'var(--r-sm)',
  rMd: 'var(--r-md)',
  rLg: 'var(--r-lg)',
  rXl: 'var(--r-xl)',
  r2xl: 'var(--r-2xl)',
  rPill: '999px',
  // Layout
  pageMax: 1360,
  gutter: 'clamp(16px,4vw,40px)'
} as const;

/**
 * Status palette for data-driven colours (price change, verification tier,
 * order state). Hex values are needed here because they feed gradients and
 * canvas rendering, which can't read CSS variables.
 */
export const HEX = {
  accent: '#4BFF8B',
  neg: '#FF6B5E',
  warn: '#E8B04B',
  info: '#6FB6FF',
  muted: '#8C958F',
  text2: '#C9D0CB',
  text: '#F2F4F1',
  bg: '#0A0C0B',
  surface: '#101312',
  sunken: '#0D100F',
  faint: '#6F7872',
  stepIdle: '#1A1F1C',
  white: '#FFFFFF',
  /** Fallbacks for items without catalogue colours. */
  placeholderPat: 'linear-gradient(180deg,#2A302D,#1A1F1C)',
  placeholderFill: '#2A302D'
} as const;

/** rgba() from a #rrggbb colour — for glows derived from catalogue colours. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
