// A shirt's photos in its card: swipe (or tap the arrows) to go through them.
// Studio cut-outs sit on the light tile with a soft shadow, like catalogue
// photos; camera photos fill the frame. Tapping a photo opens the shirt.
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { ChevronIcon } from '../../ui/index.ts';

export interface Slide {
  src: string;
  cutout: boolean;
}

export function PhotoStrip({ slides, to, label, prevLabel, nextLabel }: { slides: Slide[]; to: string; label: string; prevLabel: string; nextLabel: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const go = (i: number) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };
  return (
    <div className="photo-strip">
      <div
        ref={ref}
        className="photo-strip__track"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {slides.map((s, i) => (
          <Link key={s.src} to={to} className="photo-strip__slide" aria-label={label} tabIndex={i === 0 ? 0 : -1}>
            <img src={s.src} alt="" loading="lazy" draggable={false} className={s.cutout ? 'shirt-photo' : undefined} style={s.cutout ? { width: '86%', height: '86%', objectFit: 'contain' } : { width: '100%', height: '100%', objectFit: 'cover' }} />
          </Link>
        ))}
      </div>
      {slides.length > 1 && (
        <>
          {at > 0 && (
            <button type="button" className="photo-strip__arrow photo-strip__arrow--prev" aria-label={prevLabel} onClick={() => go(at - 1)}>
              <ChevronIcon size={14} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
          {at < slides.length - 1 && (
            <button type="button" className="photo-strip__arrow photo-strip__arrow--next" aria-label={nextLabel} onClick={() => go(at + 1)}>
              <ChevronIcon size={14} />
            </button>
          )}
          <span className="photo-strip__dots" aria-hidden="true">
            {slides.map((s, i) => (
              <span key={s.src} style={{ opacity: i === at ? 1 : 0.4 }} />
            ))}
          </span>
        </>
      )}
    </div>
  );
}
