// Catalogue shirts with a real photo, cut out on a transparent background:
// public/catalog/<id>.webp (1000 px) and <id>-400.webp, made with
// scripts/catalog-studio.swift (→ .png) and scripts/catalog-webp.py.
// Shirts not listed here keep the illustrated graphic.
const WITH_PHOTO = new Set(['acm-0607', 'ars-91', 'ger-26', 'juv-9697', 'mia-26', 'nap-8788', 'ned-88', 'sui-26']);

/** Base path of a shirt's photo (without size suffix/extension), if it has one. */
export const catalogPhoto = (id: string): string | undefined => (WITH_PHOTO.has(id) ? '/catalog/' + id : undefined);
