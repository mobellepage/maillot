// One row of cards that scrolls sideways (swipe on touch, arrows with a
// pointer). Each arrow shows only while there is more to see that way and
// moves by about a screen's worth of cards.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronIcon } from './icons.tsx';

interface Props {
  children: ReactNode;
  label?: string | undefined;
  prevLabel: string;
  nextLabel: string;
}

export function ScrollRow({ children, label, prevLabel, nextLabel }: Props) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className="scroll-row">
      <ul ref={ref} aria-label={label} className="scroll-row__list">
        {children}
      </ul>
      {!edge.start && (
        <button type="button" className="scroll-row__arrow scroll-row__arrow--prev" aria-label={prevLabel} onClick={() => go(-1)}>
          <ChevronIcon size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
      )}
      {!edge.end && (
        <button type="button" className="scroll-row__arrow scroll-row__arrow--next" aria-label={nextLabel} onClick={() => go(1)}>
          <ChevronIcon size={20} />
        </button>
      )}
    </div>
  );
}
