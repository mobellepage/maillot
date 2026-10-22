// The collector card: a shirt as a shiny trading card. The holographic
// shine follows the finger, the mouse or the tilt of the phone; with
// "reduce motion" it stays still.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { dominantColors } from './colors.ts';

export interface HoloCardData {
  image: string | undefined;
  /** A cut-out (library/studio picture), shown whole; a photo fills the frame. */
  cutout: boolean;
  /** The back of the shirt (a photo), shown when the card is turned. */
  back?: string | undefined;
  title: string;
  subtitle: string;
  chips: string[];
  handle: string | null;
  badge: string | null;
}

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function HoloCard({ card, onColors, turned = false }: { card: HoloCardData; onColors?: (c: [string, string]) => void; turned?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<[string, string]>(['#1b3a2a', '#0b0c0b']);
  const showBack = turned && !!card.back;

  // Shine and tilt from a point on the card (0..1).
  const point = (x: number, y: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.style.setProperty('--rx', `${(0.5 - y) * 16}deg`);
    el.style.setProperty('--ry', `${(x - 0.5) * 20}deg`);
    el.style.setProperty('--shine', '1');
  };
  const rest = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--shine', '0.55');
  };

  // Tilting the phone moves the shine (Android at once; iOS asks once, on a tap).
  useEffect(() => {
    if (reduced() || typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
    const on = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      point(Math.min(1, Math.max(0, 0.5 + e.gamma / 50)), Math.min(1, Math.max(0, 0.5 + (e.beta - 45) / 60)));
    };
    window.addEventListener('deviceorientation', on);
    return () => window.removeEventListener('deviceorientation', on);
  }, []);
  const askTilt = () => {
    const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (D?.requestPermission) void D.requestPermission().catch(() => {});
  };

  return (
    <div
      ref={ref}
      className={'holo' + (showBack || !card.cutout ? ' holo--photo' : '')}
      style={{ '--c1': colors[0], '--c2': colors[1] } as CSSProperties}
      onPointerMove={(e) => {
        if (reduced()) return;
        const r = e.currentTarget.getBoundingClientRect();
        point((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      }}
      onPointerLeave={rest}
      onClick={askTilt}
    >
      <div className="holo__top">
        <span className="holo__brand">Maillot</span>
        {card.badge && <span className="holo__badge">{card.badge}</span>}
      </div>
      {/* Turning the card: the art turns in, showing the back photo (or the front again). */}
      <div className="holo__art" key={showBack ? 'back' : 'front'} data-turn={showBack ? 'back' : 'front'}>
        {showBack ? (
          <img src={card.back} alt="" crossOrigin="anonymous" className="holo__photo" />
        ) : (
          card.image && (
            <img
              src={card.image}
              alt=""
              crossOrigin="anonymous"
              className={card.cutout ? 'holo__cutout' : 'holo__photo'}
              onLoad={(e) => {
                const c = dominantColors(e.currentTarget);
                if (c) {
                  setColors(c);
                  onColors?.(c);
                }
              }}
            />
          )
        )}
      </div>
      <div className="holo__text">
        <div className="holo__title">{card.title}</div>
        <div className="holo__sub">{card.subtitle}</div>
        {card.chips.length > 0 && (
          <div className="holo__chips">
            {card.chips.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        )}
        {card.handle && <div className="holo__handle">@{card.handle}</div>}
      </div>
      <span className="holo__shine" aria-hidden="true" />
      <span className="holo__glare" aria-hidden="true" />
    </div>
  );
}
