// Catalogue shirts with a real photo, cut out on a transparent background:
// public/catalog/<id>.webp (1000 px) and <id>-400.webp, made with
// scripts/catalog-studio.swift (→ .png) and scripts/catalog-webp.py.
// The others show the same kit's picture from the library (a full path).
const WITH_PHOTO = new Set(['acm-0607', 'ars-91', 'ger-26', 'juv-9697', 'mia-26', 'nap-8788', 'ned-88', 'sui-26']);
const FROM_LIBRARY: Record<string, string> = {
  'bas-2526': '/library/ch/basel/2025-26-home-kit.webp',
  'bay-2627': '/library/bl/bayern/2026-27-home-kit.webp',
  'bra-70': '/library/wc/brazil/1970-home-kit.webp',
  'fcb-2627': '/library/ll/barcelona/2026-27-home-kit.webp',
  'fra-98': '/library/wc/france/1998-home-kit.webp',
  'liv-2526': '/library/pl/liverpool/2025-26-home-kit.webp',
  'mun-0708': '/library/pl/man-united/2007-08-home-kit.webp',
  'psg-2526': '/library/l1/psg/2025-26-home-kit.webp',
  'rma-2627': '/library/ll/real-madrid/2026-27-home-kit.webp',
  'yb-2526': '/library/yb/2025-26-home-kit.webp'
};

/** A shirt's photo: a studio base path (without size suffix) or a library picture (ending in .webp), if it has one. */
export const catalogPhoto = (id: string): string | undefined => (WITH_PHOTO.has(id) ? '/catalog/' + id : FROM_LIBRARY[id]);
