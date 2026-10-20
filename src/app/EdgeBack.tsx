// In the app (iOS app, Maillot on the home screen) there is no browser back
// gesture: a swipe from the left edge to the right goes back to the page
// before, like in Instagram. In a normal browser tab the browser's own
// gesture does this, so nothing is added there. Areas with their own
// sideways swipe (data-swipe) are left alone.
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { inApp } from '../lib/zoom.ts';
import { ChevronIcon } from '../ui/index.ts';

/** Where a swipe may start (px from the left edge) and how far it must go. */
const EDGE = 24;
const GO = 90;

export function EdgeBack() {
  const navigate = useNavigate();
  const hint = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!inApp()) return;
    let start: { x: number; y: number } | null = null;
    let dx = 0;
    const show = (x: number, y?: number) => {
      const el = hint.current;
      if (!el) return;
      const p = Math.min(1, x / GO);
      el.style.opacity = String(p);
      el.style.transform = `translateX(${Math.min(x, GO) * 0.6 - 44}px)`;
      if (y !== undefined) el.style.top = y - 22 + 'px';
    };
    const down = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || !t || t.clientX > EDGE || (e.target as Element | null)?.closest?.('[data-swipe]')) return;
      start = { x: t.clientX, y: t.clientY };
      dx = 0;
    };
    const move = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!start || !t) return;
      dx = t.clientX - start.x;
      // Mostly up or down: that's scrolling, not going back.
      if (Math.abs(t.clientY - start.y) > 40 && Math.abs(t.clientY - start.y) > dx) {
        start = null;
        show(0);
        return;
      }
      show(Math.max(0, dx), t.clientY);
    };
    const up = () => {
      if (!start) return;
      start = null;
      show(0);
      if (dx < GO) return;
      // react-router numbers its history entries: with none before, go home.
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) navigate(-1);
      else navigate('/');
    };
    document.addEventListener('touchstart', down, { passive: true });
    document.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('touchend', up);
    document.addEventListener('touchcancel', up);
    return () => {
      document.removeEventListener('touchstart', down);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
      document.removeEventListener('touchcancel', up);
    };
  }, [navigate]);
  return (
    <div ref={hint} aria-hidden="true" className="edge-back">
      <ChevronIcon size={18} style={{ transform: 'rotate(180deg)' }} />
    </div>
  );
}
