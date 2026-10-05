// Illustrated shirt used wherever a catalogue item has no photo. One
// component for every view of it (front / back with print / crest close-up).
import type { CSSProperties } from 'react';

const FRONT_CLIP = 'polygon(31% 5%,39% 3%,50% 9%,61% 3%,69% 5%,97% 21%,88% 41%,78% 35%,78% 97%,22% 97%,22% 35%,12% 41%,3% 21%)';
const BACK_CLIP = 'polygon(31% 5%,39% 4%,50% 5.5%,61% 4%,69% 5%,97% 21%,88% 41%,78% 35%,78% 97%,22% 97%,22% 35%,12% 41%,3% 21%)';
const SHADE =
  'linear-gradient(90deg,rgba(0,0,0,0.32),rgba(0,0,0,0) 24%,rgba(255,255,255,0.07) 50%,rgba(0,0,0,0) 76%,rgba(0,0,0,0.32)),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(0,0,0,0.22))';

export interface ShirtLook {
  pat: string;
  trim: string;
  crest: string;
  num?: string | undefined;
}

interface Props extends ShirtLook {
  view?: 'front' | 'back' | 'crest';
  /** Bigger collar strokes and shadow for hero-sized renders. */
  hero?: boolean;
  /** Flat rendering for tiny thumbnails (no drop shadow). */
  flat?: boolean;
  printName?: string;
  printNumber?: string;
  style?: CSSProperties;
  title?: string;
}

export function ShirtGraphic({ pat, trim, crest, num, view = 'front', hero, flat, printName, printNumber, style, title }: Props) {
  const shadow = flat ? 'none' : `drop-shadow(0 ${hero ? 30 : 22}px ${hero ? 30 : 24}px rgba(0,0,0,0.55))`;
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };

  if (view === 'crest') {
    return (
      <div {...a11y} style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}>
        <div style={{ position: 'absolute', left: '-75%', top: '-20%', width: '250%', aspectRatio: '1/1' }}>
          <div style={{ position: 'absolute', inset: 0, clipPath: FRONT_CLIP, background: pat }} />
          <div style={{ position: 'absolute', inset: 0, clipPath: FRONT_CLIP, background: 'linear-gradient(180deg,rgba(255,255,255,0.1),rgba(0,0,0,0.25))' }} />
          <Collar trim={trim} width="0 8px 12px 8px" />
          <div style={{ position: 'absolute', left: '57%', top: '19%', width: '8%', height: '9%', borderRadius: '22% 22% 50% 50%', background: crest, boxShadow: '0 6px 16px rgba(0,0,0,0.35)' }} />
          <div style={{ position: 'absolute', left: '35%', top: '21%', width: '7%', height: '3.5%', borderRadius: 4, background: trim, opacity: 0.85 }} />
        </div>
      </div>
    );
  }

  const back = view === 'back';
  return (
    <div {...a11y} style={{ position: 'relative', width: '100%', aspectRatio: '1/1', filter: shadow, ...style }}>
      <div style={{ position: 'absolute', inset: 0, clipPath: back ? BACK_CLIP : FRONT_CLIP, background: pat }} />
      <div style={{ position: 'absolute', inset: 0, clipPath: back ? BACK_CLIP : FRONT_CLIP, background: SHADE }} />
      {back ? (
        printNumber && (
          <>
            <div style={{ position: 'absolute', left: 0, right: 0, top: '19%', textAlign: 'center', fontWeight: 800, fontStretch: '75%', fontSize: 'clamp(14px,2.2vw,26px)', letterSpacing: '0.08em', color: num || trim }}>
              {printName}
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: '27%', textAlign: 'center', fontWeight: 800, fontStretch: '72%', fontSize: 'clamp(60px,12vw,150px)', lineHeight: 1, color: num || trim }}>
              {printNumber}
            </div>
          </>
        )
      ) : (
        <>
          <Collar trim={trim} width={hero ? '0 3px 4px 3px' : '0 2px 3px 2px'} />
          <div style={{ position: 'absolute', left: '57%', top: '19%', width: '8%', height: '9%', borderRadius: '22% 22% 50% 50%', background: crest }} />
          <div style={{ position: 'absolute', left: '35%', top: '21%', width: '7%', height: '3.5%', borderRadius: 2, background: trim, opacity: 0.85 }} />
        </>
      )}
    </div>
  );
}

function Collar({ trim, width }: { trim: string; width: string }) {
  return <div style={{ position: 'absolute', left: '38.5%', top: '2.6%', width: '23%', height: '7%', borderStyle: 'solid', borderColor: trim, borderWidth: width, borderRadius: '0 0 50% 50%' }} />;
}
