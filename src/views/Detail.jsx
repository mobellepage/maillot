import { CLIP } from '../components/ShirtGraphic.jsx';
import { MARKET_DATA_LABEL } from '../marketData.ts';

const MONO = "'JetBrains Mono',monospace";

export default function Detail({ v }) {
  const d = v.d;
  return (
    <main style={{ maxWidth: 1360, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 80px', animation: 'kvIn .4s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8C958F', marginBottom: 22, flexWrap: 'wrap' }}>
        <button onClick={v.toBrowse} className="hov-link" style={{ background: 'none', border: 0, padding: 0, color: '#8C958F', cursor: 'pointer' }}>
          ← Marketplace
        </button>
        <span>/</span>
        <button onClick={v.toLeague} className="hov-link" style={{ background: 'none', border: 0, padding: 0, color: '#8C958F', cursor: 'pointer' }}>
          {d.league}
        </button>
        <span>/</span>
        <span style={{ color: '#C9D0CB' }}>{d.club}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,56px)', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 480px', minWidth: 0 }}>
          <div
            style={{
              position: 'relative',
              aspectRatio: '1/1',
              borderRadius: 28,
              border: '1px solid rgba(255,255,255,0.07)',
              background: `radial-gradient(circle at 50% 44%,${d.glowA} 0%,rgba(0,0,0,0) 60%),linear-gradient(180deg,#121514,#0C0E0D)`,
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 18,
                left: 18,
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px 7px 8px',
                borderRadius: 999,
                background: 'rgba(10,12,11,0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(75,255,139,0.35)',
                fontSize: 12.5,
                fontWeight: 600
              }}
            >
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#4BFF8B', display: 'grid', placeItems: 'center' }}>
                <span
                  style={{
                    width: 8,
                    height: 4,
                    borderLeft: '2px solid #06110A',
                    borderBottom: '2px solid #06110A',
                    transform: 'rotate(-45deg) translate(1px,-1px)'
                  }}
                />
              </span>
              Maillot Verified
            </div>
            <div
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                zIndex: 2,
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#C9D0CB',
                padding: '7px 12px',
                borderRadius: 999,
                background: 'rgba(10,12,11,0.7)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {d.tag}
            </div>

            {v.imgFront && (
              <div style={{ position: 'relative', width: '68%', aspectRatio: '1/1', filter: 'drop-shadow(0 40px 40px rgba(0,0,0,0.6))', animation: 'kvIn .35s ease both' }}>
                <div style={{ position: 'absolute', inset: 0, clipPath: CLIP, background: d.pat }} />
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
                    borderColor: d.trim,
                    borderWidth: '0 3px 5px 3px',
                    borderRadius: '0 0 50% 50%'
                  }}
                />
                <div style={{ position: 'absolute', left: '57%', top: '19%', width: '8%', height: '9%', borderRadius: '22% 22% 50% 50%', background: d.crest }} />
                <div style={{ position: 'absolute', left: '35%', top: '21%', width: '7%', height: '3.5%', borderRadius: 2, background: d.trim, opacity: 0.85 }} />
              </div>
            )}

            {v.imgBack && (
              <div style={{ position: 'relative', width: '68%', aspectRatio: '1/1', filter: 'drop-shadow(0 40px 40px rgba(0,0,0,0.6))', animation: 'kvIn .35s ease both' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath:
                      'polygon(31% 5%,39% 4%,50% 5.5%,61% 4%,69% 5%,97% 21%,88% 41%,78% 35%,78% 97%,22% 97%,22% 35%,12% 41%,3% 21%)',
                    background: d.pat
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath:
                      'polygon(31% 5%,39% 4%,50% 5.5%,61% 4%,69% 5%,97% 21%,88% 41%,78% 35%,78% 97%,22% 97%,22% 35%,12% 41%,3% 21%)',
                    background:
                      'linear-gradient(90deg,rgba(0,0,0,0.32),rgba(0,0,0,0) 24%,rgba(255,255,255,0.07) 50%,rgba(0,0,0,0) 76%,rgba(0,0,0,0.32)),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(0,0,0,0.22))'
                  }}
                />
                {v.hasNum && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '19%',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontStretch: '75%',
                        fontSize: 'clamp(14px,2.2vw,26px)',
                        letterSpacing: '0.08em',
                        color: d.num
                      }}
                    >
                      {d.pName}
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '27%',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontStretch: '72%',
                        fontSize: 'clamp(60px,12vw,150px)',
                        lineHeight: 1,
                        color: d.num
                      }}
                    >
                      {d.pNum}
                    </div>
                  </>
                )}
              </div>
            )}

            {v.imgCrest && (
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', animation: 'kvIn .35s ease both' }}>
                <div style={{ position: 'absolute', left: '-75%', top: '-20%', width: '250%', aspectRatio: '1/1' }}>
                  <div style={{ position: 'absolute', inset: 0, clipPath: CLIP, background: d.pat }} />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      clipPath: CLIP,
                      background: 'linear-gradient(180deg,rgba(255,255,255,0.1),rgba(0,0,0,0.25))'
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
                      borderColor: d.trim,
                      borderWidth: '0 8px 12px 8px',
                      borderRadius: '0 0 50% 50%'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: '57%',
                      top: '19%',
                      width: '8%',
                      height: '9%',
                      borderRadius: '22% 22% 50% 50%',
                      background: d.crest,
                      boxShadow: '0 6px 16px rgba(0,0,0,0.35)'
                    }}
                  />
                  <div style={{ position: 'absolute', left: '35%', top: '21%', width: '7%', height: '3.5%', borderRadius: 4, background: d.trim, opacity: 0.85 }} />
                </div>
              </div>
            )}

            {v.imgTag && (
              <div
                style={{
                  width: '62%',
                  aspectRatio: '3/4',
                  borderRadius: 16,
                  border: '1px dashed rgba(255,255,255,0.2)',
                  background: 'repeating-linear-gradient(135deg,rgba(255,255,255,0.035) 0 10px,rgba(255,255,255,0) 10px 20px)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: MONO,
                  fontSize: 12,
                  color: '#8C958F',
                  textAlign: 'center',
                  padding: 20,
                  animation: 'kvIn .35s ease both'
                }}
              >
                wash-tag photo
                <br />· verified by Maillot ·<br />
                {d.club}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {v.thumbs.map((t, i) => (
              <button
                key={i}
                onClick={t.pick}
                className="hov-border-acc6"
                style={{
                  flex: 1,
                  maxWidth: 120,
                  height: 64,
                  borderRadius: 14,
                  border: `1.5px solid ${t.border}`,
                  background: '#101312',
                  color: '#C9D0CB',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'border-color .2s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: '1 1 400px', minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C958F' }}>
            {d.brand} · {d.season} · {d.league}
          </div>
          <h1
            style={{
              margin: '12px 0 0',
              fontSize: 'clamp(32px,4.2vw,54px)',
              fontWeight: 800,
              fontStretch: '72%',
              textTransform: 'uppercase',
              lineHeight: 0.95,
              textWrap: 'balance'
            }}
          >
            {d.name}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px', marginTop: 16, fontSize: 13.5, color: '#C9D0CB' }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, color: d.chColor, background: d.chBg, padding: '5px 9px', borderRadius: 7 }}>
              {d.chFmt} · 30D
            </span>
            <span>{v.ownersLabel}</span>
            <span style={{ color: '#4A524D' }}>•</span>
            <span>{v.wantsLabel}</span>
          </div>

          <div style={{ marginTop: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Size</span>
              {v.multiSize && <span style={{ fontSize: 12.5, color: '#8C958F' }}>Market value by size</span>}
              {v.isOneSize && <span style={{ fontSize: 12.5, color: '#E8B04B' }}>Unique player-issue item</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(78px,1fr))', gap: 8 }}>
              {v.sizeOpts.map((z, i) => (
                <button
                  key={i}
                  onClick={z.pick}
                  className="hov-border-acc6"
                  style={{
                    padding: '10px 6px',
                    borderRadius: 12,
                    border: `1.5px solid ${z.border}`,
                    background: z.bg,
                    cursor: z.cur,
                    opacity: z.op,
                    transition: 'border-color .2s,background .2s'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{z.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: '#C9D0CB', marginTop: 3 }}>{z.price}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginTop: 20 }}>
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: v.hasLiveAsk ? 'rgba(75,255,139,0.06)' : '#121514',
                border: v.hasLiveAsk ? '1px solid rgba(75,255,139,0.3)' : '1px solid rgba(255,255,255,0.07)'
              }}
            >
              <div style={{ fontSize: 11.5, color: '#C9D0CB', display: 'flex', alignItems: 'center', gap: 6 }}>
                Lowest ask
                {v.hasLiveAsk && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4BFF8B', animation: 'kvPulse 1.8s ease-in-out infinite' }} />}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 'clamp(16px,1.8vw,21px)', fontWeight: 700, marginTop: 4 }}>{v.liveAskFmt}</div>
              <div style={{ fontSize: 11, color: '#8C958F', marginTop: 2 }}>{v.liveAskSub}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 14, background: '#121514', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 11.5, color: '#C9D0CB' }}>Highest bid</div>
              <div style={{ fontFamily: MONO, fontSize: 'clamp(16px,1.8vw,21px)', fontWeight: 700, marginTop: 4 }}>{v.liveBidFmt}</div>
              <div style={{ fontSize: 11, color: '#8C958F', marginTop: 2 }}>{v.liveBidSub}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 14, background: '#121514', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 11.5, color: '#C9D0CB' }}>Market value</div>
              <div style={{ fontFamily: MONO, fontSize: 'clamp(16px,1.8vw,21px)', fontWeight: 700, marginTop: 4 }}>{v.marketFmt}</div>
              <div style={{ fontSize: 11, color: '#8C958F', marginTop: 2 }}>Index estimate</div>
            </div>
          </div>
          {v.hasMyAsk && (
            <div style={{ marginTop: 10, fontSize: 13, color: '#C9D0CB' }}>
              Your ask in this size: <span style={{ fontFamily: MONO, color: '#F2F4F1' }}>{v.myAskFmt}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {v.hasLiveAsk ? (
              <button
                onClick={v.openBuy}
                className="hov-primary"
                style={{ flex: 1.3, height: 58, borderRadius: 14, border: 0, background: '#4BFF8B', color: '#06110A', fontWeight: 700, fontSize: 16, cursor: 'pointer', transition: 'box-shadow .2s,transform .15s' }}
              >
                Buy now · {v.liveAskFmt}
              </button>
            ) : (
              <button
                onClick={v.openBid}
                className="hov-primary"
                style={{ flex: 1.3, height: 58, borderRadius: 14, border: 0, background: '#4BFF8B', color: '#06110A', fontWeight: 700, fontSize: 16, cursor: 'pointer', transition: 'box-shadow .2s,transform .15s' }}
              >
                Place bid
              </button>
            )}
            <button
              onClick={v.hasLiveAsk ? v.openBid : v.sellThis}
              className="hov-outline"
              style={{ flex: 1, height: 58, borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.22)', background: 'none', color: '#F2F4F1', fontWeight: 700, fontSize: 16, cursor: 'pointer', transition: 'border-color .2s,background .2s' }}
            >
              {v.hasLiveAsk ? 'Place bid' : 'Sell yours'}
            </button>
            <button
              onClick={v.watchToggle}
              title={v.watchLabel}
              className="hov-watch"
              style={{
                width: 58,
                height: 58,
                flex: 'none',
                borderRadius: 14,
                border: '1.5px solid rgba(255,255,255,0.14)',
                background: 'none',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                transition: 'transform .2s'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={d.heartFill} stroke={d.heartStroke} strokeWidth="2">
                <path d="M12 20.5s-7.5-4.6-9.4-9.3C1.2 7.8 3.4 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.5 0 5.7 3.3 4.3 6.7-1.9 4.7-9.4 9.3-9.4 9.3z" />
              </svg>
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              marginTop: 18,
              padding: 16,
              borderRadius: 14,
              background: '#101312',
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <div style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, background: 'rgba(75,255,139,0.12)', display: 'grid', placeItems: 'center' }}>
              <div style={{ width: 12, height: 14, border: '2px solid #4BFF8B', borderRadius: '3px 3px 7px 7px' }} />
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: '#C9D0CB' }}>
              <span style={{ color: '#F2F4F1', fontWeight: 600 }}>14-point authentication in Zürich.</span> Every shirt is inspected by our
              team before it ships to you. Not as described? Full refund.
            </div>
          </div>
        </div>
      </div>

      <section style={{ marginTop: 'clamp(32px,5vw,56px)', padding: 'clamp(18px,2.4vw,28px)', borderRadius: 24, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8C958F' }}>
              Price history · {v.headSub}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 'clamp(26px,3vw,36px)', fontWeight: 700 }}>{v.headPrice}</span>
              <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: v.rangeColor }}>{v.rangeChange}</span>
            </div>
          </div>
          <div style={{ display: 'flex', padding: 4, borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)' }}>
            {v.ranges.map((r, i) => (
              <button
                key={i}
                onClick={r.pick}
                style={{
                  padding: '7px 13px',
                  borderRadius: 999,
                  border: 0,
                  cursor: 'pointer',
                  fontFamily: MONO,
                  fontSize: 12,
                  fontWeight: 600,
                  background: r.bg,
                  color: r.color,
                  transition: 'all .2s'
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', height: 'clamp(200px,28vw,300px)' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px 0', pointerEvents: 'none' }}>
            <div style={{ borderTop: '1px dashed rgba(255,255,255,0.07)' }} />
            <div style={{ borderTop: '1px dashed rgba(255,255,255,0.07)' }} />
            <div style={{ borderTop: '1px dashed rgba(255,255,255,0.07)' }} />
          </div>
          <svg viewBox="0 0 1000 280" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id="kvArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={v.chartColor} stopOpacity="0.26" />
                <stop offset="1" stopColor={v.chartColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={v.areaD} fill="url(#kvArea)" />
            <path d={v.lineD} fill="none" stroke={v.chartColor} strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
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
              padding: '12px 0',
              pointerEvents: 'none',
              fontFamily: MONO,
              fontSize: 11,
              color: '#8C958F',
              textAlign: 'right'
            }}
          >
            <span style={{ background: '#101312', paddingLeft: 6 }}>{v.yTop}</span>
            <span style={{ background: '#101312', paddingLeft: 6 }}>{v.yMid}</span>
            <span style={{ background: '#101312', paddingLeft: 6 }}>{v.yBot}</span>
          </div>
          {v.hoverOn && (
            <>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: v.hoverLeft, width: 1, background: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
              <div
                style={{
                  position: 'absolute',
                  left: v.hoverLeft,
                  top: v.hoverTop,
                  width: 12,
                  height: 12,
                  margin: '-6px 0 0 -6px',
                  borderRadius: '50%',
                  background: v.chartColor,
                  boxShadow: '0 0 0 5px rgba(75,255,139,0.2)',
                  pointerEvents: 'none'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: v.hoverLeft,
                  top: -6,
                  transform: `translateX(${v.tipX})`,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: '#F2F4F1',
                  color: '#0A0C0B',
                  fontFamily: MONO,
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}
              >
                {v.hoverPrice} · {v.hoverDate}
              </div>
            </>
          )}
          <div
            onMouseMove={v.onChartMove}
            onTouchMove={v.onChartMove}
            onMouseLeave={v.onChartLeave}
            onTouchEnd={v.onChartLeave}
            style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: MONO, fontSize: 11, color: '#6F7872' }}>
          {v.xLabels.map((x, i) => (
            <span key={i}>{x.l}</span>
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 16, marginTop: 16 }}>
        <div style={{ padding: 24, borderRadius: 24, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, fontStretch: '80%', textTransform: 'uppercase', marginBottom: 12 }}>Details</div>
          {v.details.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14 }}>
              <span style={{ color: '#8C958F' }}>{r.k}</span>
              <span style={{ textAlign: 'right' }}>{r.v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', fontSize: 14 }}>
            <span style={{ color: '#8C958F' }}>Authentication</span>
            <span style={{ color: '#4BFF8B', fontWeight: 600 }}>✓ Maillot Verified</span>
          </div>
        </div>

        <div style={{ padding: 24, borderRadius: 24, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 800, fontStretch: '80%', textTransform: 'uppercase' }}>Market</div>
            <span
              title={MARKET_DATA_LABEL + ' — Maillot hat noch keine echte Transaktionshistorie angebunden; diese Zahlen dienen der Demo.'}
              style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: '#8C958F', border: '1px solid rgba(255,255,255,0.14)', cursor: 'help' }}
            >
              DEMO
            </span>
          </div>
          {v.market.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14 }}>
              <span style={{ color: '#8C958F' }}>{r.k}</span>
              <span style={{ fontFamily: MONO }}>{r.v}</span>
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 600, margin: '18px 0 8px' }}>Recent sales</div>
          {v.sales.map((x, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 50px auto', gap: 10, padding: '7px 0', fontFamily: MONO, fontSize: 12.5, color: '#C9D0CB' }}>
              <span>{x.date}</span>
              <span>{x.size}</span>
              <span style={{ color: '#F2F4F1' }}>{x.price}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: 24, borderRadius: 24, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, fontStretch: '80%', textTransform: 'uppercase', marginBottom: 16 }}>Community</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
            <div style={{ padding: 14, borderRadius: 14, background: '#0D100F' }}>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{v.ownersLabel}</div>
              <div style={{ fontSize: 12, color: '#8C958F', marginTop: 2 }}>in collections</div>
            </div>
            <div style={{ padding: 14, borderRadius: 14, background: '#0D100F' }}>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{v.wantsLabel}</div>
              <div style={{ fontSize: 12, color: '#8C958F', marginTop: 2 }}>on wishlists</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {v.comments.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', background: '#1E2421', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: '#C9D0CB' }}>
                  {c.ini}
                </div>
                <div>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{c.u}</span>
                    <span style={{ color: '#6F7872' }}> · {c.d}</span>
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#C9D0CB', marginTop: 3, textWrap: 'pretty' }}>{c.t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section style={{ marginTop: 'clamp(48px,6vw,80px)' }}>
        <h2 style={{ margin: '0 0 22px', fontSize: 'clamp(26px,3vw,38px)', fontWeight: 800, fontStretch: '75%', textTransform: 'uppercase', lineHeight: 1 }}>
          You might also like
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,158px),1fr))', gap: 'clamp(10px,1.4vw,18px)' }}>
          {v.related.map((s) => (
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
                <div style={{ position: 'relative', width: '68%', aspectRatio: '1/1', filter: 'drop-shadow(0 22px 24px rgba(0,0,0,0.55))' }}>
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
                  <div style={{ position: 'absolute', left: '35%', top: '21%', width: '7%', height: '3.5%', borderRadius: 2, background: s.trim, opacity: 0.85 }} />
                </div>
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
      </section>
    </main>
  );
}
