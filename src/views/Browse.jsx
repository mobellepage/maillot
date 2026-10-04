import ShirtGraphic from '../components/ShirtGraphic.jsx';

export default function Browse({ v }) {
  return (
    <main style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(28px,4vw,48px) clamp(16px,4vw,40px) 80px', animation: 'kvIn .4s ease both' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
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
            Marketplace
          </div>
          <h1
            style={{
              margin: '8px 0 6px',
              fontSize: 'clamp(36px,5vw,64px)',
              fontWeight: 800,
              fontStretch: '72%',
              textTransform: 'uppercase',
              lineHeight: 0.95
            }}
          >
            All shirts
          </h1>
          <div style={{ fontSize: 13.5, color: '#8C958F' }}>{v.resultLabel}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: '1 1 360px', justifyContent: 'flex-end' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 46,
              padding: '0 14px',
              borderRadius: 12,
              background: '#121514',
              border: '1px solid rgba(255,255,255,0.09)',
              flex: '1 1 220px',
              maxWidth: 360,
              color: '#8C958F'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5"></path>
            </svg>
            <input
              value={v.q}
              onChange={v.onNavSearch}
              placeholder="Club, player, season…"
              style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 14, color: '#F2F4F1' }}
            />
          </div>
          <select
            value={v.sort}
            onChange={v.onSort}
            style={{
              height: 46,
              padding: '0 14px',
              borderRadius: 12,
              background: '#121514',
              border: '1px solid rgba(255,255,255,0.09)',
              fontSize: 14,
              color: '#F2F4F1',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="trending">Sort: Trending</option>
            <option value="gain">Sort: Biggest gainers</option>
            <option value="newest">Sort: Newest</option>
            <option value="asc">Sort: Price low → high</option>
            <option value="desc">Sort: Price high → low</option>
          </select>
          {v.isMobile && (
            <button
              onClick={v.toggleFilters}
              style={{
                height: 46,
                padding: '0 16px',
                borderRadius: 12,
                border: '1px solid rgba(75,255,139,0.5)',
                background: 'rgba(75,255,139,0.06)',
                color: '#F2F4F1',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {v.filterBtnLabel}
            </button>
          )}
        </div>
      </div>
      {v.hasChips && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 20 }}>
          {v.chips.map((c, i) => (
            <button
              key={i}
              onClick={c.rm}
              className="hov-chip-bg"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                borderRadius: 999,
                border: '1px solid rgba(75,255,139,0.4)',
                background: 'rgba(75,255,139,0.07)',
                color: '#F2F4F1',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background .2s'
              }}
            >
              {c.label}
              <span style={{ color: '#4BFF8B', fontSize: 15, lineHeight: 1 }}>×</span>
            </button>
          ))}
          <button
            onClick={v.clearAll}
            className="hov-link"
            style={{ background: 'none', border: 0, color: '#8C958F', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 6 }}
          >
            Clear all
          </button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: v.browseDir, gap: 32, alignItems: 'flex-start' }}>
        {v.showAside && (
          <aside
            style={{
              flex: v.asideFlex,
              width: '100%',
              position: v.asidePos,
              top: 92,
              maxHeight: 'calc(100vh - 110px)',
              overflowY: 'auto',
              paddingRight: 6
            }}
          >
            {v.filterGroups.map((g, gi) => (
              <div key={gi} style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#8C958F',
                    marginBottom: 10
                  }}
                >
                  {g.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {g.options.map((o, oi) => (
                    <button
                      key={oi}
                      onClick={o.toggle}
                      className="hov-filter"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        background: 'none',
                        border: 0,
                        padding: '7px 6px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: o.color,
                        fontSize: 14,
                        transition: 'background .15s'
                      }}
                    >
                      <span
                        style={{
                          width: 17,
                          height: 17,
                          borderRadius: 5,
                          border: `1.5px solid ${o.box}`,
                          background: o.fill,
                          display: 'grid',
                          placeItems: 'center',
                          flex: 'none',
                          transition: 'all .15s'
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 4,
                            borderLeft: '2px solid #0A0C0B',
                            borderBottom: '2px solid #0A0C0B',
                            transform: 'rotate(-45deg) translate(1px,-1px)',
                            opacity: o.tick
                          }}
                        ></span>
                      </span>
                      <span style={{ flex: 1 }}>{o.label}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#6F7872' }}>{o.count}</span>
                    </button>
                  ))}
                  {g.hasMore && (
                    <button
                      onClick={g.toggleMore}
                      style={{ background: 'none', border: 0, padding: '8px 6px 0', textAlign: 'left', color: '#4BFF8B', fontSize: 13, cursor: 'pointer' }}
                    >
                      {g.moreLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div style={{ padding: '16px 0 8px' }}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#8C958F',
                  marginBottom: 10
                }}
              >
                Price range
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, marginBottom: 12 }}>{v.priceLabel}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#8C958F' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  Min
                  <input type="range" min="0" max="600" step="10" value={v.minPrice} onChange={v.onMin} style={{ flex: 1 }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  Max
                  <input type="range" min="0" max="600" step="10" value={v.maxPrice} onChange={v.onMax} style={{ flex: 1 }} />
                </label>
              </div>
            </div>
          </aside>
        )}
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          {v.noResults && (
            <div style={{ padding: '80px 24px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase' }}>No shirts match</div>
              <p style={{ color: '#8C958F', fontSize: 14, margin: '8px 0 20px' }}>Try removing a filter — or be the first to list it.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={v.clearAll}
                  style={{
                    height: 44,
                    padding: '0 18px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'none',
                    color: '#F2F4F1',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Clear filters
                </button>
                <button
                  onClick={v.goSell}
                  style={{ height: 44, padding: '0 18px', borderRadius: 12, border: 0, background: '#4BFF8B', color: '#06110A', cursor: 'pointer', fontWeight: 700 }}
                >
                  List a shirt
                </button>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,158px),1fr))', gap: 'clamp(10px,1.4vw,18px)' }}>
            {v.results.map((s) => (
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
                      <div style={{ fontSize: 10.5, color: '#8C958F' }}>Market value</div>
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
        </div>
      </div>
    </main>
  );
}
