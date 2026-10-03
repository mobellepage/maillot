const CLIP = 'polygon(31% 5%,39% 3%,50% 9%,61% 3%,69% 5%,97% 21%,88% 41%,78% 35%,78% 97%,22% 97%,22% 35%,12% 41%,3% 21%)';

// Reusable "front of shirt" icon used across cards, hero, detail, sell flow etc.
export default function ShirtGraphic({ pat, trim, crest, hero = false, style }) {
  const borderWidth = hero ? '0 3px 4px 3px' : '0 2px 3px 2px';
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1/1',
        filter: `drop-shadow(0 ${hero ? 30 : 22}px ${hero ? 30 : 24}px rgba(0,0,0,0.55))`,
        ...style
      }}
    >
      <div style={{ position: 'absolute', inset: 0, clipPath: CLIP, background: pat }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: CLIP,
          background:
            'linear-gradient(90deg,rgba(0,0,0,0.32),rgba(0,0,0,0) 24%,rgba(255,255,255,0.07) 50%,rgba(0,0,0,0) 76%,rgba(0,0,0,0.32)),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(0,0,0,0.22))'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '38.5%',
          top: '2.6%',
          width: '23%',
          height: '7%',
          borderStyle: 'solid',
          borderColor: trim,
          borderWidth,
          borderRadius: '0 0 50% 50%'
        }}
      />
      <div style={{ position: 'absolute', left: '57%', top: '19%', width: '8%', height: '9%', borderRadius: '22% 22% 50% 50%', background: crest }} />
      <div style={{ position: 'absolute', left: '35%', top: '21%', width: '7%', height: '3.5%', borderRadius: '2px', background: trim, opacity: 0.85 }} />
    </div>
  );
}

export { CLIP };
