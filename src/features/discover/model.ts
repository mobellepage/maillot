// Discover's curated shelves: the decades to browse and football's legends
// with the clubs and national teams they played for. Kit pictures only — no
// portraits of players.

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
  /** Club or national team, first and last season year (2003 = 2003/04). */
  spans: { club: string; from: number; to: number }[];
}

export const LEGENDS: Legend[] = [
  { slug: 'maradona', name: 'Diego Maradona', img: '/library/sa/napoli/1987-88-home-kit.webp', spans: [{ club: 'barcelona', from: 1982, to: 1983 }, { club: 'napoli', from: 1984, to: 1990 }, { club: 'sevilla', from: 1992, to: 1992 }, { club: 'argentina', from: 1977, to: 1994 }] },
  { slug: 'messi', name: 'Lionel Messi', img: '/library/ll/barcelona/2010-11-home-kit.webp', spans: [{ club: 'barcelona', from: 2004, to: 2020 }, { club: 'psg', from: 2021, to: 2022 }, { club: 'argentina', from: 2005, to: 2026 }] },
  { slug: 'pele', name: 'Pelé', img: '/library/wc/brazil/1970-home-kit.webp', spans: [{ club: 'brazil', from: 1957, to: 1971 }] },
  { slug: 'cristiano-ronaldo', name: 'Cristiano Ronaldo', img: '/library/ll/real-madrid/2016-17-home-kit.webp', spans: [{ club: 'man-united', from: 2003, to: 2008 }, { club: 'real-madrid', from: 2009, to: 2017 }, { club: 'juventus', from: 2018, to: 2020 }, { club: 'man-united', from: 2021, to: 2021 }, { club: 'portugal', from: 2003, to: 2026 }] },
  { slug: 'ronaldo-nazario', name: 'Ronaldo Nazário', img: '/library/wc/brazil/2002-home-kit.webp', spans: [{ club: 'barcelona', from: 1996, to: 1996 }, { club: 'inter', from: 1997, to: 2001 }, { club: 'real-madrid', from: 2002, to: 2006 }, { club: 'milan', from: 2006, to: 2007 }, { club: 'brazil', from: 1994, to: 2006 }] },
  { slug: 'cruyff', name: 'Johan Cruyff', img: '/library/wc/netherlands/1974-home-kit.webp', spans: [{ club: 'barcelona', from: 1973, to: 1977 }, { club: 'netherlands', from: 1966, to: 1977 }] },
  { slug: 'zidane', name: 'Zinédine Zidane', img: '/library/wc/france/1998-home-kit.webp', spans: [{ club: 'juventus', from: 1996, to: 2000 }, { club: 'real-madrid', from: 2001, to: 2005 }, { club: 'france', from: 1994, to: 2006 }] },
  { slug: 'ronaldinho', name: 'Ronaldinho', img: '/library/ll/barcelona/2005-06-home-kit.webp', spans: [{ club: 'psg', from: 2001, to: 2002 }, { club: 'barcelona', from: 2003, to: 2007 }, { club: 'milan', from: 2008, to: 2010 }, { club: 'brazil', from: 1999, to: 2013 }] },
  { slug: 'mbappe', name: 'Kylian Mbappé', img: '/library/wc/france/2018-home-kit.webp', spans: [{ club: 'monaco', from: 2015, to: 2016 }, { club: 'psg', from: 2017, to: 2023 }, { club: 'real-madrid', from: 2024, to: 2026 }, { club: 'france', from: 2017, to: 2026 }] },
  { slug: 'lamine-yamal', name: 'Lamine Yamal', img: '/library/ll/barcelona/2025-26-home-kit.webp', spans: [{ club: 'barcelona', from: 2023, to: 2026 }, { club: 'spain', from: 2024, to: 2026 }] }
];

export const LEGEND_BY: Record<string, Legend> = Object.fromEntries(LEGENDS.map((l) => [l.slug, l]));
