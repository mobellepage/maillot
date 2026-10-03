import ShirtGraphic, { CLIP } from '../components/ShirtGraphic.jsx';
import { downloadVaultCard } from '../utils/cardExport.js';

const MONO = "'JetBrains Mono',monospace";

export default function Profile({ v }) {
  return (
    <main style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(28px,4vw,48px) clamp(16px,4vw,40px) 80px', animation: 'kvIn .4s ease both' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', border: '3px solid #4BFF8B', padding: 4, flex: 'none' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg,#2B3A31,#151A17)', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 800 }}>
            LM
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px,4vw,48px)', fontWeight: 800, fontStretch: '72%', textTransform: 'uppercase', lineHeight: 1 }}>Luca Meier</h1>
          <div style={{ fontSize: 14, color: '#8C958F', marginTop: 6 }}>@vintage.luca · Zürich · Collector since 2021</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: 'rgba(75,255,139,0.1)', color: '#4BFF8B' }}>✓ Verified collector</span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: '#C9D0CB' }}>Top 5% portfolio</span>
          </div>
        </div>
        <button onClick={v.shareCollection} style={{ height: 48, padding: '0 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontWeight: 600, cursor: 'pointer' }}>
          Sammlung teilen
        </button>
        <button onClick={v.goAddShirt} style={{ height: 48, padding: '0 22px', borderRadius: 14, border: 0, background: '#4BFF8B', color: '#06110A', fontWeight: 700, cursor: 'pointer' }}>
          + Add a shirt
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 32 }}>
        <div
          style={{
            flex: '1 1 300px',
            padding: 'clamp(20px,2.4vw,28px)',
            borderRadius: 24,
            background: '#101312',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 24
          }}
        >
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8C958F' }}>Portfolio value</div>
            <div style={{ fontFamily: MONO, fontSize: 'clamp(36px,4vw,48px)', fontWeight: 700, marginTop: 8 }}>{v.pValue}</div>
            <div style={{ fontFamily: MONO, fontSize: 15, color: '#4BFF8B', marginTop: 6 }}>
              {v.pGain} ({v.pGainPct}) all time
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ padding: 14, borderRadius: 14, background: '#0D100F' }}>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>{v.pCount}</div>
              <div style={{ fontSize: 12, color: '#8C958F' }}>shirts</div>
            </div>
            <div style={{ padding: 14, borderRadius: 14, background: '#0D100F' }}>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>{v.watchCount}</div>
              <div style={{ fontSize: 12, color: '#8C958F' }}>watching</div>
            </div>
          </div>
        </div>

        <div style={{ flex: '2 1 520px', minWidth: 0, padding: 'clamp(20px,2.4vw,28px)', borderRadius: 24, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, fontStretch: '80%', textTransform: 'uppercase' }}>Value development</div>
              <div style={{ fontFamily: MONO, fontSize: 13, color: '#4BFF8B', marginTop: 4 }}>{v.pRangeCh} this period</div>
            </div>
            <div style={{ display: 'flex', padding: 4, borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)' }}>
              {v.pRanges.map((r, i) => (
                <button
                  key={i}
                  onClick={r.pick}
                  style={{ padding: '6px 13px', borderRadius: 999, border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 12, fontWeight: 600, background: r.bg, color: r.color }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', height: 200, marginTop: 16 }}>
            <svg viewBox="0 0 1000 240" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
              <defs>
                <linearGradient id="kvPort" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#4BFF8B" stopOpacity="0.25" />
                  <stop offset="1" stopColor="#4BFF8B" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={v.pArea} fill="url(#kvPort)" />
              <path d={v.pLine} fill="none" stroke="#4BFF8B" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
            </svg>
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: MONO,
                fontSize: 11,
                color: '#8C958F',
                pointerEvents: 'none'
              }}
            >
              <span>{v.pTop}</span>
              <span>{v.pBot}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 28, marginTop: 40, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {v.pTabs.map((t, i) => (
          <button
            key={i}
            onClick={t.pick}
            style={{
              background: 'none',
              border: 0,
              padding: '0 0 14px',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 700,
              color: t.color,
              borderBottom: `2px solid ${t.bar}`,
              marginBottom: -1,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              transition: 'color .2s'
            }}
          >
            {t.label}
            <span style={{ fontFamily: MONO, fontSize: 12, color: '#8C958F' }}>{t.n}</span>
          </button>
        ))}
      </div>

      {v.tabCollection && v.hasRejected && (
        <div style={{ marginTop: 24, padding: 16, borderRadius: 16, background: 'rgba(255,107,94,0.06)', border: '1px solid rgba(255,107,94,0.25)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#FF6B5E' }}>
            {v.rejectedItems.length === 1 ? '1 Einreichung abgelehnt' : v.rejectedItems.length + ' Einreichungen abgelehnt'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {v.rejectedItems.map((r) => (
              <button
                key={r.id}
                onClick={r.open}
                style={{ textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 13, color: '#C9D0CB' }}
              >
                <span style={{ fontWeight: 600 }}>{r.name}</span> — {r.reason} <span style={{ color: '#8C958F', textDecoration: 'underline' }}>Ansehen</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {v.tabCollection && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,200px),1fr))', gap: 'clamp(10px,1.4vw,18px)', marginTop: 24 }}>
          {v.owned.map((s) => (
            <div
              key={s.id}
              onClick={s.open}
              className="hov-card-lift"
              style={{ cursor: 'pointer', borderRadius: 22, overflow: 'hidden', background: '#101312', border: '1px solid rgba(255,255,255,0.06)', transition: 'transform .3s,border-color .3s' }}
            >
              <div
                style={{
                  aspectRatio: '1/1.08',
                  display: 'grid',
                  placeItems: 'center',
                  position: 'relative',
                  background: `radial-gradient(circle at 50% 46%,${s.glowA},rgba(0,0,0,0) 62%),#0D100F`
                }}
              >
                <span style={{ position: 'absolute', top: 12, left: 12, fontFamily: MONO, fontSize: 10.5, color: '#C9D0CB' }}>
                  SIZE {s.size} · {s.when}
                </span>
                {s.isCustom && (
                  <span
                    title={s.badgeDesc}
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      fontFamily: MONO,
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: 999,
                      color: s.badgeColor,
                      background: s.badgeBg,
                      border: `1px solid ${s.badgeColor}55`
                    }}
                  >
                    {s.badgeLabel}
                  </span>
                )}
                <div style={{ position: 'relative', width: '66%', aspectRatio: '1/1', filter: 'drop-shadow(0 22px 24px rgba(0,0,0,0.55))' }}>
                  <div style={{ position: 'absolute', inset: 0, clipPath: CLIP, background: s.pat }} />
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
                      borderColor: s.trim,
                      borderWidth: '0 2px 3px 2px',
                      borderRadius: '0 0 50% 50%'
                    }}
                  />
                  <div style={{ position: 'absolute', left: '57%', top: '19%', width: '8%', height: '9%', borderRadius: '22% 22% 50% 50%', background: s.crest }} />
                </div>
              </div>
              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25, height: '2.5em', overflow: 'hidden' }}>{s.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#8C958F' }}>{s.paid}</div>
                    <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, marginTop: 2 }}>{s.priceFmt}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: s.gainC }}>{s.gain}</span>
                    <button
                      title="Als Bild exportieren"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadVaultCard(s);
                      }}
                      style={{
                        width: 30,
                        height: 30,
                        flex: 'none',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#C9D0CB',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 13
                      }}
                    >
                      ⇩
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {v.tabWatch && (
        <>
          {v.watchEmpty && <div style={{ padding: '60px 20px', textAlign: 'center', color: '#8C958F' }}>Your watchlist is empty. Tap the heart on any shirt to track its price.</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,158px),1fr))', gap: 'clamp(10px,1.4vw,18px)', marginTop: 24 }}>
            {v.watchItems.map((s) => (
              <div
                key={s.id}
                onClick={s.open}
                className="hov-card"
                style={{
                  cursor: 'pointer',
                  background: '#101312',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 20,
                  overflow: 'hidden',
                  transition: 'transform .3s cubic-bezier(.2,.7,.2,1),border-color .3s,box-shadow .3s'
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '1/1',
                    display: 'grid',
                    placeItems: 'center',
                    background: `radial-gradient(circle at 50% 46%,${s.glowA} 0%,rgba(0,0,0,0) 62%),#0D100F`
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      fontFamily: MONO,
                      fontSize: 9.5,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '5px 8px',
                      borderRadius: 6,
                      background: 'rgba(10,12,11,0.72)',
                      color: '#C9D0CB',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    {s.tag}
                  </div>
                  <button
                    onClick={s.toggleWatch}
                    className="hov-scale"
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: 0,
                      background: 'rgba(10,12,11,0.6)',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      transition: 'transform .2s'
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={s.heartFill} stroke={s.heartStroke} strokeWidth="2">
                      <path d="M12 20.5s-7.5-4.6-9.4-9.3C1.2 7.8 3.4 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.5 0 5.7 3.3 4.3 6.7-1.9 4.7-9.4 9.3-9.4 9.3z" />
                    </svg>
                  </button>
                  <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} style={{ width: '68%' }} />
                </div>
                <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8C958F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.brand} · {s.season}
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25, height: '2.5em', overflow: 'hidden' }}>{s.name}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, marginTop: 4 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, color: '#8C958F' }}>Lowest ask</div>
                      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.priceFmt}</div>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 600, color: s.chColor, background: s.chBg, padding: '4px 7px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                      {s.chFmt}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
