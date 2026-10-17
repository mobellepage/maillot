// Discover's curated shelves: the decades to browse and football's legends
// (their kits are listed in the database, kit_legends; illustrations in
// public/legends).

/** Where a library kit lives: its club page, scrolled to the season. */
export const kitHref = (k: { club_id: string; season: string }) => '/library/' + k.club_id + '#' + encodeURIComponent('season-' + k.season);

export const ERAS: { decade: number; img: string }[] = [
  { decade: 1970, img: '/library/wc/brazil/1970-home-kit.webp' },
  { decade: 1980, img: '/library/sa/napoli/1987-88-home-kit.webp' },
  { decade: 1990, img: '/library/pl/man-united/1999-00-home-kit.webp' },
  { decade: 2000, img: '/library/sa/milan/2006-07-home-kit.webp' },
  { decade: 2010, img: '/library/wc/germany/2014-home-kit.webp' },
  { decade: 2020, img: '/library/wc/argentina/2022-home-kit.webp' }
];

/** "70" for 1970 — the label's number ("70s", "70er", "années 70"). */
export const eraNumber = (decade: number) => String(decade % 100).padStart(2, '0');

export interface Legend {
  slug: string;
  name: string;
  img: string;
}

export const LEGENDS: Legend[] = [
  { slug: 'maradona', name: 'Diego Maradona', img: '/legends/maradona.webp' },
  { slug: 'messi', name: 'Lionel Messi', img: '/legends/messi.webp' },
  { slug: 'pele', name: 'Pelé', img: '/legends/pele.webp' },
  { slug: 'cristiano-ronaldo', name: 'Cristiano Ronaldo', img: '/legends/cristiano-ronaldo.webp' },
  { slug: 'ronaldo-nazario', name: 'Ronaldo Nazário', img: '/legends/ronaldo-nazario.webp' },
  { slug: 'cruyff', name: 'Johan Cruyff', img: '/legends/cruyff.webp' },
  { slug: 'zidane', name: 'Zinédine Zidane', img: '/legends/zidane.webp' },
  { slug: 'ronaldinho', name: 'Ronaldinho', img: '/legends/ronaldinho.webp' },
  { slug: 'mbappe', name: 'Kylian Mbappé', img: '/legends/mbappe.webp' },
  { slug: 'lamine-yamal', name: 'Lamine Yamal', img: '/legends/lamine-yamal.webp' }
];

export const LEGEND_BY: Record<string, Legend> = Object.fromEntries(LEGENDS.map((l) => [l.slug, l]));
