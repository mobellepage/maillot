import ShirtGraphic from '../components/ShirtGraphic.jsx';

export default function Home({ v }) {
  return (
    <main style={{ animation: 'kvIn .45s ease both' }}>
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          background:
            'radial-gradient(ellipse 55% 55% at 12% -18%,rgba(225,255,236,0.11),rgba(0,0,0,0) 70%),radial-gradient(ellipse 45% 50% at 92% -12%,rgba(225,255,236,0.09),rgba(0,0,0,0) 70%),radial-gradient(ellipse 80% 50% at 70% 110%,rgba(75,255,139,0.08),rgba(0,0,0,0) 70%)'
        }}
      >
        <div
          style={{
            maxWidth: 1360,
            margin: '0 auto',
            padding: 'clamp(36px,7vw,96px) clamp(16px,4vw,40px) clamp(40px,6vw,80px)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(32px,5vw,64px)',
            alignItems: 'center'
          }}
        >
          <div style={{ flex: '1 1 520px', minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 14px 7px 10px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.1)',
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11.5,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#C9D0CB'
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#4BFF8B',
                  boxShadow: '0 0 12px #4BFF8B',
                  animation: 'kvPulse 1.8s ease-in-out infinite'
                }}
              ></span>
              Live price index · 48’210 shirts
            </div>
            <h1
              style={{
                margin: '22px 0 0',
                fontSize: 'clamp(46px,7.6vw,104px)',
                lineHeight: 0.9,
                fontWeight: 800,
                fontStretch: '72%',
                textTransform: 'uppercase',
                letterSpacing: '-0.005em'
              }}
            >
              Every shirt.
              <br />
              Every season.
              <br />
              <span style={{ color: '#4BFF8B' }}>One market.</span>
            </h1>
            <p
              style={{
                margin: '24px 0 0',
                maxWidth: 520,
                fontSize: 'clamp(16px,1.4vw,18px)',
                lineHeight: 1.55,
                color: '#C9D0CB',
                textWrap: 'pretty'
              }}
            >
              The catalogue, marketplace and price index for football shirts — new releases, retro classics and match-worn grails. Every
              sale authenticated in Zürich.
            </p>
            <div style={{ position: 'relative', marginTop: 32, maxWidth: 620 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  height: 64,
                  padding: '0 8px 0 22px',
                  borderRadius: 18,
                  background: '#121514',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8C958F" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="7"></circle>
                  <path d="M20 20l-3.5-3.5"></path>
                </svg>
                <input
                  value={v.heroQ}
                  onChange={v.onHeroQ}
                  onKeyDown={v.onHeroKey}
                  placeholder="Search any shirt…"
                  style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 17, color: '#F2F4F1' }}
                />
                <button
                  onClick={v.heroGo}
                  className="hov-glow"
                  style={{
                    height: 48,
                    padding: '0 22px',
                    borderRadius: 12,
                    border: 0,
                    background: '#4BFF8B',
                    color: '#06110A',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                    transition: 'box-shadow .2s'
                  }}
                >
                  Search
                </button>
              </div>
              {v.showSug && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 72,
                    zIndex: 20,
                    background: '#141816',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 16,
                    padding: 6,
                    boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
                    animation: 'kvIn .2s ease both'
                  }}
                >
                  {v.sug.map((s) => (
                    <button
                      key={s.id}
                      onClick={s.open}
                      className="hov-bg-soft"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        padding: '8px 10px',
                        border: 0,
                        borderRadius: 10,
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 9,
                          background: '#0D100F',
                          display: 'grid',
                          placeItems: 'center',
                          flex: 'none'
                        }}
                      >
                        <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} style={{ width: '80%', filter: 'none' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#8C958F' }}>
                          {s.brand} · {s.league}
                        </div>
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>{s.priceFmt}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {v.quick.map((c, i) => (
                <button
                  key={i}
                  onClick={c.go}
                  className="hov-chip"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.02)',
                    fontSize: 13,
                    color: '#C9D0CB',
                    cursor: 'pointer',
                    transition: 'all .2s'
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(20px,4vw,48px)', marginTop: 40 }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 600 }}>CHF 12.4M</div>
                <div style={{ fontSize: 13, color: '#8C958F', marginTop: 2 }}>traded in 2026</div>
              </div>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 600 }}>86’000</div>
                <div style={{ fontSize: 13, color: '#8C958F', marginTop: 2 }}>collectors</div>
              </div>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 600 }}>100%</div>
                <div style={{ fontSize: 13, color: '#8C958F', marginTop: 2 }}>authenticated</div>
              </div>
            </div>
          </div>
          <div style={{ flex: '1 1 400px', minWidth: 0 }}>
            <div
              onClick={v.feat.open}
              className="hov-feat"
              style={{
                position: 'relative',
                aspectRatio: '1/1.02',
                borderRadius: 32,
                border: '1px solid rgba(255,255,255,0.08)',
                background: `radial-gradient(circle at 50% 42%,${v.feat.glowA} 0%,rgba(0,0,0,0) 58%),linear-gradient(180deg,#121514,#0C0E0D)`,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'transform .4s cubic-bezier(.2,.7,.2,1),border-color .3s'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 22,
                  left: 22,
                  right: 22,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#C9D0CB'
                  }}
                >
                  Shirt of the week
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#06110A',
                    background: '#4BFF8B',
                    padding: '5px 10px',
                    borderRadius: 999
                  }}
                >
                  ▲ 31% · 30D
                </span>
              </div>
              <ShirtGraphic
                hero
                pat={v.feat.pat}
                trim={v.feat.trim}
                crest={v.feat.crest}
                style={{ width: '66%', transform: 'translateY(-4%)', filter: 'drop-shadow(0 40px 40px rgba(0,0,0,0.6))' }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 18,
                  right: 18,
                  bottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '16px 18px',
                  borderRadius: 20,
                  background: 'rgba(14,17,16,0.78)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.25 }}>{v.feat.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#8C958F', marginTop: 4 }}>
                    adidas · Authentic
                  </div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div style={{ fontSize: 11, color: '#8C958F' }}>Lowest ask</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 700 }}>{v.feat.priceFmt}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0C0E0D' }}>
        <div
          style={{
            maxWidth: 1360,
            margin: '0 auto',
            padding: '0 clamp(16px,4vw,40px)',
            display: 'flex',
            gap: 0,
            overflowX: 'auto'
          }}
        >
          {v.indices.map((x, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                padding: '16px 28px 16px 0',
                marginRight: 28,
                borderRight: '1px solid rgba(255,255,255,0.07)',
                whiteSpace: 'nowrap',
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 13
              }}
            >
              <span style={{ color: '#8C958F' }}>{x.label}</span>
              <span style={{ fontWeight: 600 }}>{x.val}</span>
              <span style={{ color: x.color }}>{x.ch}</span>
            </div>
          ))}
        </div>
      </div>
      <section style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(48px,6vw,88px) clamp(16px,4vw,40px) 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#4BFF8B'
              }}
            >
              This week
            </div>
            <h2
              style={{
                margin: '8px 0 0',
                fontSize: 'clamp(30px,4vw,48px)',
                fontWeight: 800,
                fontStretch: '75%',
                textTransform: 'uppercase',
                lineHeight: 1
              }}
            >
              Trending shirts
            </h2>
          </div>
          <button
            onClick={v.goBrowse}
            className="hov-acc"
            style={{ background: 'none', border: 0, color: '#C9D0CB', fontSize: 14, cursor: 'pointer', padding: '8px 0', whiteSpace: 'nowrap' }}
          >
            View marketplace →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,158px),1fr))', gap: 'clamp(10px,1.4vw,18px)' }}>
          {v.trending.map((s) => (
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
                    fontFamily: "'JetBrains Mono',monospace",
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
                    <path d="M12 20.5s-7.5-4.6-9.4-9.3C1.2 7.8 3.4 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.5 0 5.7 3.3 4.3 6.7-1.9 4.7-9.4 9.3-9.4 9.3z"></path>
                  </svg>
                </button>
                <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} style={{ width: '68%' }} />
              </div>
              <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#8C958F',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {s.brand} · {s.season}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25, height: '2.5em', overflow: 'hidden' }}>{s.name}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, marginTop: 4 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, color: '#8C958F' }}>Lowest ask</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {s.priceFmt}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: s.chColor,
                      background: s.chBg,
                      padding: '4px 7px',
                      borderRadius: 6,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {s.chFmt}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(56px,7vw,100px) clamp(16px,4vw,40px) 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 24,
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#4BFF8B'
              }}
            >
              30-day change
            </div>
            <h2
              style={{
                margin: '8px 0 0',
                fontSize: 'clamp(30px,4vw,48px)',
                fontWeight: 800,
                fontStretch: '75%',
                textTransform: 'uppercase',
                lineHeight: 1
              }}
            >
              Biggest movers
            </h2>
          </div>
          <div style={{ display: 'flex', padding: 4, borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)' }}>
            {v.moverTabs.map((t, i) => (
              <button
                key={i}
                onClick={t.pick}
                style={{
                  padding: '8px 18px',
                  borderRadius: 999,
                  border: 0,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  background: t.bg,
                  color: t.color,
                  transition: 'all .2s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,420px),1fr))',
            gap: '4px 28px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            paddingTop: 8
          }}
        >
          {v.movers.map((m) => (
            <div
              key={m.id}
              onClick={m.open}
              className="hov-row"
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14, cursor: 'pointer', transition: 'background .2s' }}
            >
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#6F7872', width: 20 }}>{m.rank}</div>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  background: `radial-gradient(circle,${m.glowA},rgba(0,0,0,0) 72%),#0D100F`,
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none'
                }}
              >
                <ShirtGraphic pat={m.pat} trim={m.trim} crest={m.crest} style={{ width: '78%', filter: 'none' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 12.5, color: '#8C958F', marginTop: 3 }}>
                  {m.brand} · {m.league}
                </div>
              </div>
              {v.notMobile && (
                <svg viewBox="0 0 100 32" preserveAspectRatio="none" style={{ width: 84, height: 30, flex: 'none' }}>
                  <path d={m.spark} fill="none" stroke={m.chColor} strokeWidth="1.6" vectorEffect="non-scaling-stroke"></path>
                </svg>
              )}
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 600 }}>{m.priceFmt}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: m.chColor, marginTop: 3 }}>{m.chFmt}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(56px,7vw,100px) 0 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 24,
            padding: '0 clamp(16px,4vw,40px)'
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#4BFF8B'
              }}
            >
              Just catalogued
            </div>
            <h2
              style={{
                margin: '8px 0 0',
                fontSize: 'clamp(30px,4vw,48px)',
                fontWeight: 800,
                fontStretch: '75%',
                textTransform: 'uppercase',
                lineHeight: 1
              }}
            >
              New to the catalogue
            </h2>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '0 clamp(16px,4vw,40px) 12px', scrollSnapType: 'x mandatory' }}>
          {v.newest.map((s) => (
            <div
              key={s.id}
              onClick={s.open}
              className="hov-card-lift"
              style={{
                flex: '0 0 clamp(220px,22vw,280px)',
                scrollSnapAlign: 'start',
                cursor: 'pointer',
                borderRadius: 22,
                overflow: 'hidden',
                background: '#101312',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'border-color .3s,transform .3s'
              }}
            >
              <div
                style={{
                  aspectRatio: '4/3.4',
                  display: 'grid',
                  placeItems: 'center',
                  background: `radial-gradient(circle at 50% 50%,${s.glowA} 0%,rgba(0,0,0,0) 60%),#0D100F`,
                  position: 'relative'
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#4BFF8B'
                  }}
                >
                  ● {s.added}
                </span>
                <ShirtGraphic
                  pat={s.pat}
                  trim={s.trim}
                  crest={s.crest}
                  style={{ width: '56%', filter: 'drop-shadow(0 18px 22px rgba(0,0,0,0.55))' }}
                />
              </div>
              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
                  <span style={{ color: '#8C958F' }}>{s.brand}</span>
                  <span style={{ fontWeight: 600 }}>{s.priceFmt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <footer
        style={{
          maxWidth: 1360,
          margin: 'clamp(64px,8vw,120px) auto 0',
          padding: '32px clamp(16px,4vw,40px) 48px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#8C958F',
          fontSize: 13
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 800, fontStretch: '78%', fontSize: 18, color: '#F2F4F1', letterSpacing: '0.03em' }}>MAILLOT</span>
          <span>The market for football shirts.</span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>© 2026 Maillot AG · Zürich · Prices in CHF</div>
      </footer>
    </main>
  );
}
