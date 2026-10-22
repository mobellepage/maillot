// Clubs matching a few typed letters, best first: the exact name, then names
// and short names ("YB", "BVB", "Juve" …) that start with them, then a word
// that does, then anywhere in the name. Accents don't matter.
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function matchClubs<C extends { name: string; aliases?: string[] | null }>(clubs: C[], text: string, limit = 8): C[] {
  const q = norm(text.trim());
  if (!q) return [];
  return clubs
    .map((c) => {
      const names = [c.name, ...(c.aliases ?? [])].map(norm);
      const rank = names.some((n) => n === q) ? 0 : names.some((n) => n.startsWith(q)) ? 1 : names.some((n) => n.split(/[\s.-]+/).some((w) => w.startsWith(q))) ? 2 : names.some((n) => n.includes(q)) ? 3 : 9;
      return { c, rank };
    })
    .filter((x) => x.rank < 9)
    .sort((a, b) => a.rank - b.rank || a.c.name.localeCompare(b.c.name))
    .slice(0, limit)
    .map((x) => x.c);
}
