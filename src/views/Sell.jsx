import ShirtGraphic, { CLIP } from '../components/ShirtGraphic.jsx';

const MONO = "'JetBrains Mono',monospace";

export default function Sell({ v }) {
  const sj = v.sj;
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(28px,4vw,48px) clamp(16px,4vw,40px) 80px', animation: 'kvIn .4s ease both' }}>
      {v.sFlow && (
        <>
          <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4BFF8B' }}>Sell a shirt</div>
          <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(36px,5vw,64px)', fontWeight: 800, fontStretch: '72%', textTransform: 'uppercase', lineHeight: 0.95 }}>
            List in under a minute
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 32px', overflowX: 'auto', paddingBottom: 4 }}>
            {v.sellSteps.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: t.bg,
                    color: t.color,
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: MONO,
                    fontSize: 12,
                    fontWeight: 700,
                    transition: 'background .3s'
                  }}
                >
                  {t.n}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: t.lc, whiteSpace: 'nowrap' }}>{t.label}</span>
                {t.notLast && <span style={{ width: 'clamp(20px,5vw,56px)', height: 2, borderRadius: 2, background: t.bar, transition: 'background .3s' }} />}
              </div>
            ))}
          </div>
        </>
      )}

      {v.s0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'stretch' }}>
          <div style={{ flex: '1 1 440px', minWidth: 0 }}>
            {v.scanIdle && (
              <>
                <label
                  className="hov-border-acc-strong"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 14,
                    aspectRatio: '1/1',
                    borderRadius: 28,
                    border: '1.5px dashed rgba(75,255,139,0.45)',
                    background: 'radial-gradient(circle at 50% 40%,rgba(75,255,139,0.08),rgba(0,0,0,0) 60%),#0F1211',
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: 24,
                    transition: 'border-color .2s,background .2s'
                  }}
                >
                  <input type="file" accept="image/*" onChange={v.onFile} style={{ display: 'none' }} />
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 22,
                      background: '#4BFF8B',
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 0 50px rgba(75,255,139,0.35)'
                    }}
                  >
                    <div style={{ width: 30, height: 24, border: '3px solid #06110A', borderRadius: 6, position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          width: 10,
                          height: 10,
                          margin: '-5px 0 0 -5px',
                          border: '3px solid #06110A',
                          borderRadius: '50%'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: 'clamp(22px,2.6vw,30px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase', lineHeight: 1 }}>
                    Upload a photo
                  </div>
                  <div style={{ fontSize: 14, color: '#C9D0CB', maxWidth: 300, lineHeight: 1.5 }}>
                    Front of the shirt, laid flat. Our AI identifies the club, season and edition — and suggests a price.
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: '#6F7872' }}>JPG · PNG · HEIC — up to 20 MB</div>
                </label>
                <button
                  onClick={v.sampleScan}
                  className="hov-border-acc6"
                  style={{
                    width: '100%',
                    marginTop: 12,
                    height: 50,
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: '#121514',
                    color: '#F2F4F1',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'border-color .2s'
                  }}
                >
                  No photo handy? Try with a sample shirt →
                </button>
              </>
            )}

            {v.scanActive && (
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '1/1',
                  borderRadius: 28,
                  overflow: 'hidden',
                  border: '1px solid rgba(75,255,139,0.3)',
                  background: 'radial-gradient(circle at 50% 45%,rgba(255,255,255,0.12),rgba(0,0,0,0) 60%),#0D100F',
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                {v.hasUpload && (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: v.sImgBg, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                )}
                {v.noUpload && (
                  <div style={{ position: 'relative', width: '68%', aspectRatio: '1/1' }}>
                    <ShirtGraphic pat={sj.pat} trim={sj.trim} crest={sj.crest} hero style={{ position: 'absolute', inset: 0, width: '100%' }} />
                    <div
                      style={{
                        position: 'absolute',
                        left: '52%',
                        top: '15%',
                        width: '18%',
                        height: '18%',
                        border: '2px solid #4BFF8B',
                        borderRadius: 6,
                        opacity: v.box1,
                        transition: 'opacity .4s'
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          bottom: 'calc(100% + 4px)',
                          whiteSpace: 'nowrap',
                          fontFamily: MONO,
                          fontSize: 10,
                          fontWeight: 700,
                          background: '#4BFF8B',
                          color: '#06110A',
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                      >
                        CREST · 98%
                      </span>
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        left: '33%',
                        top: 0,
                        width: '34%',
                        height: '13%',
                        border: '2px solid #4BFF8B',
                        borderRadius: 6,
                        opacity: v.box2,
                        transition: 'opacity .4s'
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          right: 'calc(100% + 6px)',
                          top: 0,
                          whiteSpace: 'nowrap',
                          fontFamily: MONO,
                          fontSize: 10,
                          fontWeight: 700,
                          background: '#4BFF8B',
                          color: '#06110A',
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                      >
                        COLLAR · 96/97
                      </span>
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        left: '30%',
                        top: '18%',
                        width: '17%',
                        height: '10%',
                        border: '2px solid #4BFF8B',
                        borderRadius: 6,
                        opacity: v.box3,
                        transition: 'opacity .4s'
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          right: 'calc(100% + 6px)',
                          top: 0,
                          whiteSpace: 'nowrap',
                          fontFamily: MONO,
                          fontSize: 10,
                          fontWeight: 700,
                          background: '#4BFF8B',
                          color: '#06110A',
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                      >
                        KAPPA
                      </span>
                    </div>
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: v.scanTop,
                    height: 2,
                    background: '#4BFF8B',
                    boxShadow: '0 0 24px 6px rgba(75,255,139,0.45)',
                    opacity: v.lineOp,
                    transition: 'opacity .3s'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    height: v.scanTop,
                    background: 'linear-gradient(180deg,rgba(75,255,139,0),rgba(75,255,139,0.08))',
                    opacity: v.lineOp,
                    pointerEvents: 'none'
                  }}
                />
                <div style={{ position: 'absolute', top: 16, left: 16, width: 28, height: 28, borderTop: '3px solid #4BFF8B', borderLeft: '3px solid #4BFF8B', borderRadius: '8px 0 0 0' }} />
                <div style={{ position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderTop: '3px solid #4BFF8B', borderRight: '3px solid #4BFF8B', borderRadius: '0 8px 0 0' }} />
                <div style={{ position: 'absolute', bottom: 16, left: 16, width: 28, height: 28, borderBottom: '3px solid #4BFF8B', borderLeft: '3px solid #4BFF8B', borderRadius: '0 0 0 8px' }} />
                <div style={{ position: 'absolute', bottom: 16, right: 16, width: 28, height: 28, borderBottom: '3px solid #4BFF8B', borderRight: '3px solid #4BFF8B', borderRadius: '0 0 8px 0' }} />
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 22,
                    transform: 'translateX(-50%)',
                    padding: '8px 14px',
                    borderRadius: 999,
                    background: 'rgba(10,12,11,0.82)',
                    backdropFilter: 'blur(10px)',
                    fontFamily: MONO,
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                    border: '1px solid rgba(75,255,139,0.3)'
                  }}
                >
                  {v.scanMsg}
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                padding: 24,
                borderRadius: 24,
                background: 'linear-gradient(160deg,rgba(75,255,139,0.1),rgba(75,255,139,0) 50%),#101312',
                border: '1px solid rgba(75,255,139,0.25)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', background: '#4BFF8B', color: '#06110A', padding: '4px 8px', borderRadius: 6 }}>
                  AI SCAN
                </span>
                <span style={{ fontSize: 13, color: '#C9D0CB' }}>Trained on 48’210 catalogued shirts</span>
              </div>
              <div style={{ fontSize: 'clamp(22px,2.4vw,28px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase', lineHeight: 1.05, marginTop: 14 }}>
                Photo in. Club, season &amp; price out.
              </div>

              {v.scanIdle && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
                  <div style={{ display: 'flex', gap: 12, fontSize: 14, color: '#C9D0CB' }}>
                    <span style={{ fontFamily: MONO, color: '#4BFF8B' }}>01</span>Upload a flat-lay photo of the front
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 14, color: '#C9D0CB' }}>
                    <span style={{ fontFamily: MONO, color: '#4BFF8B' }}>02</span>AI matches crest, collar, sponsor &amp; brand marks
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 14, color: '#C9D0CB' }}>
                    <span style={{ fontFamily: MONO, color: '#4BFF8B' }}>03</span>Get a suggested price from real recent sales
                  </div>
                </div>
              )}

              {v.scanning && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 12, color: '#C9D0CB', marginBottom: 8 }}>
                    <span>Analysing</span>
                    <span>{v.scanPct}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: v.scanW, background: '#4BFF8B', borderRadius: 6 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
                    {v.scanChecks.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: c.c, transition: 'color .3s' }}>
                        <span style={{ width: 16, height: 16, borderRadius: '50%', background: c.ic, transition: 'background .3s', flex: 'none' }} />
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {v.scanDone && (
                <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', animation: 'kvIn .4s ease both' }}>
                  {v.aiFields.map((a, i) => (
                    <div
                      key={i}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 14 }}
                    >
                      <span style={{ color: '#8C958F' }}>{a.k}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 600 }}>{a.v}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: '#4BFF8B', background: 'rgba(75,255,139,0.1)', padding: '2px 6px', borderRadius: 5 }}>{a.c}</span>
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: 16, padding: 16, borderRadius: 16, background: '#0A0C0B', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: 12, color: '#8C958F' }}>Suggested price</div>
                    <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, marginTop: 4 }}>CHF 225 – 255</div>
                    <div style={{ fontSize: 12.5, color: '#C9D0CB', marginTop: 4 }}>Market value CHF 240 · 41 sales in the last 90 days · ▲ 11% 30D</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button
                      onClick={v.sNext}
                      className="hov-glow"
                      style={{
                        flex: 1,
                        height: 52,
                        borderRadius: 14,
                        border: 0,
                        background: '#4BFF8B',
                        color: '#06110A',
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: 'pointer',
                        transition: 'box-shadow .2s'
                      }}
                    >
                      Looks right — continue
                    </button>
                    <button
                      onClick={v.rescan}
                      style={{ height: 52, padding: '0 18px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                    >
                      Rescan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {v.s1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 760, animation: 'kvIn .35s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#0A0C0B', display: 'grid', placeItems: 'center', flex: 'none' }}>
              <div style={{ position: 'relative', width: '80%', aspectRatio: '1/1' }}>
                <div style={{ position: 'absolute', inset: 0, clipPath: CLIP, background: sj.pat }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Juventus 1996/97 Home</div>
              <div style={{ fontSize: 12.5, color: '#8C958F', marginTop: 2 }}>Kappa · Serie A · identified by AI Scan</div>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#4BFF8B' }}>✓ MATCHED</span>
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Size</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {v.sSizes.map((z, i) => (
                <button
                  key={i}
                  onClick={z.pick}
                  style={{ width: 64, height: 48, borderRadius: 12, border: `1.5px solid ${z.border}`, background: z.bg, fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Condition</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,170px),1fr))', gap: 8 }}>
              {v.sConds.map((c, i) => (
                <button
                  key={i}
                  onClick={c.pick}
                  style={{ padding: 14, borderRadius: 14, border: `1.5px solid ${c.border}`, background: c.bg, textAlign: 'left', cursor: 'pointer', transition: 'all .2s' }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</div>
                  <div style={{ fontSize: 12.5, color: '#8C958F', marginTop: 4, lineHeight: 1.4 }}>{c.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Edition</div>
            <div style={{ display: 'inline-flex', flexWrap: 'wrap', padding: 4, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', gap: 2 }}>
              {v.sEds.map((x, i) => (
                <button
                  key={i}
                  onClick={x.pick}
                  style={{ padding: '9px 16px', borderRadius: 10, border: 0, background: x.bg, color: x.color, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', transition: 'all .2s' }}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              Player print <span style={{ color: '#8C958F', fontWeight: 400 }}>(optional)</span>
            </div>
            <input
              value={v.sPlayer}
              onChange={v.onPlayer}
              placeholder="e.g. Del Piero 10"
              style={{ width: '100%', height: 50, padding: '0 16px', borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 15, color: '#F2F4F1' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>More photos</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
              <div style={{ aspectRatio: '1/1', borderRadius: 14, background: '#0D100F', border: '1.5px solid #4BFF8B', display: 'grid', placeItems: 'center', fontSize: 11, color: '#4BFF8B', fontFamily: MONO }}>
                FRONT ✓
              </div>
              <div style={{ aspectRatio: '1/1', borderRadius: 14, border: '1.5px dashed rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', fontSize: 11, color: '#8C958F', fontFamily: MONO, textAlign: 'center' }}>
                + BACK
              </div>
              <div style={{ aspectRatio: '1/1', borderRadius: 14, border: '1.5px dashed rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', fontSize: 11, color: '#8C958F', fontFamily: MONO, textAlign: 'center' }}>
                + WASH TAG
              </div>
              <div style={{ aspectRatio: '1/1', borderRadius: 14, border: '1.5px dashed rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', fontSize: 11, color: '#8C958F', fontFamily: MONO, textAlign: 'center' }}>
                + DETAIL
              </div>
            </div>
          </div>
        </div>
      )}

      {v.s2 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, animation: 'kvIn .35s ease both' }}>
          <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Your asking price</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 80, padding: '0 22px', borderRadius: 18, background: '#0D100F', border: '1.5px solid rgba(75,255,139,0.45)' }}>
                <span style={{ fontFamily: MONO, color: '#8C958F', fontSize: 20 }}>CHF</span>
                <input
                  value={v.sAsk}
                  onChange={v.onAsk}
                  inputMode="numeric"
                  style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontFamily: MONO, fontSize: 38, fontWeight: 700, color: '#F2F4F1' }}
                />
              </div>
              <div style={{ fontSize: 13.5, color: v.askHintC, marginTop: 10 }}>{v.askHint}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {v.sQuick.map((b, i) => (
                <button
                  key={i}
                  onClick={b.pick}
                  className="hov-border-acc"
                  style={{ flex: 1, minWidth: 120, padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#121514', textAlign: 'left', cursor: 'pointer', transition: 'border-color .2s' }}
                >
                  <div style={{ fontSize: 12, color: '#8C958F' }}>{b.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, marginTop: 2 }}>{b.v}</div>
                </button>
              ))}
            </div>

            <div style={{ padding: 22, borderRadius: 20, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 40 }}>Where you sit in the market · size L</div>
              <div
                style={{
                  position: 'relative',
                  height: 6,
                  borderRadius: 6,
                  background: 'linear-gradient(90deg,rgba(255,255,255,0.08),rgba(75,255,139,0.3),rgba(255,255,255,0.08))',
                  margin: '0 8px 44px'
                }}
              >
                {v.mkMarks.map((m, i) => (
                  <div key={i} style={{ position: 'absolute', left: m.left, top: -4, width: 2, height: 14, background: m.c }}>
                    <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', textAlign: 'center', fontSize: 11, color: '#8C958F' }}>
                      {m.l}
                      <div style={{ fontFamily: MONO, color: m.c, fontSize: 11.5 }}>{m.v}</div>
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    position: 'absolute',
                    left: v.yourLeft,
                    top: -10,
                    width: 26,
                    height: 26,
                    marginLeft: -13,
                    borderRadius: '50%',
                    background: '#F2F4F1',
                    border: '4px solid #0A0C0B',
                    boxShadow: '0 0 0 2px #F2F4F1',
                    transition: 'left .3s'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 30,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                      fontFamily: MONO,
                      fontSize: 12,
                      fontWeight: 700,
                      background: '#F2F4F1',
                      color: '#0A0C0B',
                      padding: '3px 8px',
                      borderRadius: 6
                    }}
                  >
                    You · {v.askFmtS}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div style={{ padding: 24, borderRadius: 24, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, fontStretch: '80%', textTransform: 'uppercase', marginBottom: 10 }}>Payout</div>
              {v.payRows.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14 }}>
                  <span style={{ color: '#8C958F' }}>{r.k}</span>
                  <span style={{ fontFamily: MONO }}>{r.v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14 }}>
                <span style={{ fontWeight: 600 }}>You earn</span>
                <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: '#4BFF8B' }}>{v.payout}</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#8C958F', marginTop: 10, lineHeight: 1.5 }}>Paid to your bank or TWINT 24h after the buyer receives the shirt.</div>
            </div>
          </div>
        </div>
      )}

      {v.s3 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, animation: 'kvIn .35s ease both' }}>
          <div
            style={{
              flex: '1 1 360px',
              minWidth: 0,
              aspectRatio: '1/1',
              maxWidth: 520,
              borderRadius: 28,
              background: `radial-gradient(circle at 50% 45%,${sj.glowA},rgba(0,0,0,0) 60%),#0D100F`,
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <div style={{ position: 'relative', width: '66%', aspectRatio: '1/1', filter: 'drop-shadow(0 30px 30px rgba(0,0,0,0.6))' }}>
              <div style={{ position: 'absolute', inset: 0, clipPath: CLIP, background: sj.pat }} />
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
                  borderColor: sj.trim,
                  borderWidth: '0 3px 4px 3px',
                  borderRadius: '0 0 50% 50%'
                }}
              />
              <div style={{ position: 'absolute', left: '57%', top: '19%', width: '8%', height: '9%', borderRadius: '22% 22% 50% 50%', background: sj.crest }} />
            </div>
          </div>

          <div style={{ flex: '1 1 340px', minWidth: 0, padding: 24, borderRadius: 24, background: '#101312', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase', marginBottom: 10 }}>Review listing</div>
            {v.review.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14 }}>
                <span style={{ color: '#8C958F' }}>{r.k}</span>
                <span style={{ textAlign: 'right', fontWeight: 500 }}>{r.v}</span>
              </div>
            ))}
            <div style={{ flex: 1, minHeight: 16 }} />
            <button
              onClick={v.publish}
              className="hov-primary"
              style={{
                width: '100%',
                height: 58,
                marginTop: 18,
                borderRadius: 14,
                border: 0,
                background: '#4BFF8B',
                color: '#06110A',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                transition: 'box-shadow .2s,transform .15s'
              }}
            >
              Publish listing
            </button>
            <div style={{ fontSize: 12, color: '#8C958F', textAlign: 'center', marginTop: 10 }}>You'll ship to our Zürich vault with a prepaid label once it sells.</div>
          </div>
        </div>
      )}

      {v.showNext && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 32, maxWidth: 1100 }}>
          <button onClick={v.sBack} style={{ height: 52, padding: '0 22px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontWeight: 600, cursor: 'pointer' }}>
            ← Back
          </button>
          <button
            onClick={v.sNext}
            className="hov-next"
            style={{ height: 52, padding: '0 28px', borderRadius: 14, border: 0, background: '#F2F4F1', color: '#0A0C0B', fontWeight: 700, cursor: 'pointer', transition: 'background .2s' }}
          >
            {v.nextLabel} →
          </button>
        </div>
      )}

      {v.s3 && (
        <button onClick={v.sBack} style={{ marginTop: 24, height: 48, padding: '0 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontWeight: 600, cursor: 'pointer' }}>
          ← Back
        </button>
      )}

      {v.sPub && (
        <div style={{ maxWidth: 560, margin: 'clamp(20px,6vw,60px) auto', textAlign: 'center', animation: 'kvIn .45s ease both' }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              margin: '0 auto 24px',
              background: 'rgba(75,255,139,0.12)',
              border: '2px solid #4BFF8B',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 60px rgba(75,255,139,0.25)'
            }}
          >
            <div style={{ width: 32, height: 16, borderLeft: '5px solid #4BFF8B', borderBottom: '5px solid #4BFF8B', transform: 'rotate(-45deg) translate(2px,-4px)' }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(36px,5vw,56px)', fontWeight: 800, fontStretch: '72%', textTransform: 'uppercase', lineHeight: 0.95 }}>You're live</h1>
          <p style={{ color: '#C9D0CB', fontSize: 16, lineHeight: 1.55, margin: '14px 0 28px', textWrap: 'pretty' }}>
            Your Juventus 1996/97 Home is listed. 2’140 collectors watching this shirt have been notified.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={v.viewListing} style={{ height: 52, padding: '0 24px', borderRadius: 14, border: 0, background: '#4BFF8B', color: '#06110A', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              View listing
            </button>
            <button onClick={v.listAnother} style={{ height: 52, padding: '0 24px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
              List another
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
