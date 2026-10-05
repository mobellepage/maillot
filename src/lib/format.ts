// Locale-aware date helpers shared by notifications, orders and admin.

export function timeAgo(iso: string, lang: string = 'en'): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (min < 1) return rtf.format(0, 'second');
  if (min < 60) return rtf.format(-min, 'minute');
  const h = Math.floor(min / 60);
  if (h < 24) return rtf.format(-h, 'hour');
  return rtf.format(-Math.floor(h / 24), 'day');
}

export function formatDate(iso: string | number, lang: string = 'en', withTime = false): string {
  return new Date(iso).toLocaleDateString(lang === 'de' ? 'de-CH' : 'en-GB', withTime ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' });
}
