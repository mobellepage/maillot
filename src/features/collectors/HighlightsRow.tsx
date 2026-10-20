// A profile's highlights as round pictures under the header, like
// Instagram's story highlights — the owner's top five shirts.
import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';

export interface HighlightCircle {
  id: string;
  to: string;
  name: string;
  src: string | undefined;
}

export function HighlightsRow({ items }: { items: HighlightCircle[] }) {
  const { t } = usePrefs();
  if (!items.length) return null;
  return (
    <ul aria-label={t('hl.row')} className="ig-highlights">
      {items.map((h) => (
        <li key={h.id}>
          <Link to={h.to} className="ig-highlight" aria-label={h.name}>
            <span className="ig-highlight__ring">
              <span className="ig-highlight__img">{h.src && <img src={h.src} alt="" loading="lazy" decoding="async" />}</span>
            </span>
            <span className="ig-highlight__name">{h.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
