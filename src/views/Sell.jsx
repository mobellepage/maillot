import ShirtGraphic from '../components/ShirtGraphic.jsx';

const MONO = "'JetBrains Mono',monospace";
const CARD = { padding: 24, borderRadius: 24, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' };

function ShirtRow({ s, right }) {
  return (
    <button
      onClick={s.pick}
      className="hov-bg-soft"
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', border: 0, borderRadius: 12, background: 'none', cursor: 'pointer', textAlign: 'left' }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 10, background: '#0A0C0B', display: 'grid', placeItems: 'center', flex: 'none' }}>
        <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} style={{ width: '80%', filter: 'none' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
        <div style={{ fontSize: 12, color: '#8C958F' }}>
          {s.brand} · {s.league}
        </div>
      </div>
      {right || <div style={{ fontFamily: MONO, fontSize: 13, color: '#C9D0CB' }}>{s.priceFmt}</div>}
    </button>
  );
}

function SelectedShirt({ v }) {
  const s = v.sShirt;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, background: '#0A0C0B', display: 'grid', placeItems: 'center', flex: 'none' }}>
        <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} style={{ width: '80%', filter: 'none' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{s.name}</div>
        <div style={{ fontSize: 12.5, color: '#8C958F', marginTop: 2 }}>
          {s.brand} · {s.league} · market value {s.priceFmt}
        </div>
      </div>
      <button onClick={v.sChange} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#C9D0CB', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        Change
      </button>
    </div>
  );
}

export default function Sell({ v }) {
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
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: t.bg, color: t.color, display: 'grid', placeItems: 'center', fontFamily: MONO, fontSize: 12, fontWeight: 700, transition: 'background .3s' }}>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 440px', minWidth: 0, ...CARD }}>
            <div style={{ fontSize: 'clamp(22px,2.4vw,28px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase', lineHeight: 1.05 }}>Which shirt are you selling?</div>
            <div style={{ fontSize: 14, color: '#C9D0CB', marginTop: 8 }}>Search the catalogue by club, season, brand or player.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 56, padding: '0 18px', marginTop: 18, borderRadius: 14, background: '#0A0C0B', border: '1px solid rgba(255,255,255,0.12)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8C958F" strokeWidth="2.2" aria-hidden="true">
                <circle cx="11" cy="11" r="7"></circle>
                <path d="M20 20l-3.5-3.5"></path>
              </svg>
              <input
                value={v.sQuery}
                onChange={v.onSellQuery}
                placeholder="e.g. Juventus 1996, Maradona, Basel"
                aria-label="Search the catalogue"
                autoFocus
                style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 16, color: '#F2F4F1' }}
              />
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' }}>
              {v.sellResults.map((s) => (
                <ShirtRow key={s.id} s={s} />
              ))}
              {v.sellNoResults && <div style={{ padding: '14px 4px', fontSize: 14, color: '#8C958F' }}>No catalogue match. Try fewer words — or add it to your collection via “Add shirt” to have it catalogued.</div>}
              {v.showSellPopular && (
                <>
                  <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C958F', margin: '12px 4px 4px' }}>In demand right now</div>
                  {v.sellPopular.map((s) => (
                    <ShirtRow key={s.id} s={s} />
                  ))}
                </>
              )}
            </div>
          </div>

          <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label
              className="hov-border-acc-strong"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                minHeight: 280,
                borderRadius: 24,
                overflow: 'hidden',
                border: '1.5px dashed rgba(75,255,139,0.45)',
                background: 'radial-gradient(circle at 50% 40%,rgba(75,255,139,0.08),rgba(0,0,0,0) 60%),#0F1211',
                cursor: v.sScanBusy ? 'progress' : 'pointer',
                textAlign: 'center',
                padding: 24,
                transition: 'border-color .2s'
              }}
            >
              <input type="file" accept="image/*" capture="environment" onChange={v.onSellFile} disabled={v.sScanBusy} style={{ display: 'none' }} />
              {v.hasSellImg && <div style={{ position: 'absolute', inset: 0, backgroundImage: v.sImgBg, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35 }} />}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', background: '#4BFF8B', color: '#06110A', padding: '4px 8px', borderRadius: 6 }}>LABEL SCAN</span>
                <div style={{ fontSize: 'clamp(20px,2.2vw,26px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase', lineHeight: 1 }}>
                  {v.sScanBusy ? 'Reading label…' : 'Or snap the inner label'}
                </div>
                <div style={{ fontSize: 13.5, color: '#C9D0CB', maxWidth: 300, lineHeight: 1.5 }}>
                  We read the printed product label on your device (nothing is uploaded) and match it to the catalogue.
                </div>
                {v.sScanBusy && (
                  <div style={{ width: 160, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <div style={{ width: '40%', height: '100%', background: '#4BFF8B', animation: 'kvSlide 1.1s ease-in-out infinite' }} />
                  </div>
                )}
              </div>
            </label>
            {v.sScanMatch && (
              <div style={{ ...CARD, padding: 14, border: '1px solid rgba(75,255,139,0.35)', animation: 'kvIn .3s ease both' }}>
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4BFF8B', margin: '0 4px 6px' }}>Label match</div>
                <ShirtRow s={v.sScanMatch} right={<span style={{ fontFamily: MONO, fontSize: 11, color: '#4BFF8B', background: 'rgba(75,255,139,0.1)', padding: '3px 7px', borderRadius: 6 }}>{v.sScanMatch.confidence}</span>} />
              </div>
            )}
            {v.sScanMsg && !v.sScanBusy && <div style={{ fontSize: 13.5, color: '#E8B04B', lineHeight: 1.5 }}>{v.sScanMsg}</div>}
          </div>
        </div>
      )}

      {v.s1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 760, animation: 'kvIn .35s ease both' }}>
          <SelectedShirt v={v} />

          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Size</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {v.sSizes.map((z, i) => (
                <button key={i} onClick={z.pick} style={{ minWidth: 64, height: 48, padding: '0 12px', borderRadius: 12, border: `1.5px solid ${z.border}`, background: z.bg, fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}>
                  {z.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Condition</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,170px),1fr))', gap: 8 }}>
              {v.sConds.map((c, i) => (
                <button key={i} onClick={c.pick} style={{ padding: 14, borderRadius: 14, border: `1.5px solid ${c.border}`, background: c.bg, textAlign: 'left', cursor: 'pointer', transition: 'all .2s' }}>
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
                <button key={i} onClick={x.pick} style={{ padding: '9px 16px', borderRadius: 10, border: 0, background: x.bg, color: x.color, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', transition: 'all .2s' }}>
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
        </div>
      )}

      {v.s2 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, animation: 'kvIn .35s ease both' }}>
          <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SelectedShirt v={v} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Your asking price</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 80, padding: '0 22px', borderRadius: 18, background: '#0D100F', border: '1.5px solid rgba(75,255,139,0.45)' }}>
                <span style={{ fontFamily: MONO, color: '#8C958F', fontSize: 20 }}>CHF</span>
                <input
                  value={v.sAsk}
                  onChange={v.onAsk}
                  inputMode="numeric"
                  placeholder="0"
                  aria-label="Asking price in CHF"
                  autoFocus
                  style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontFamily: MONO, fontSize: 38, fontWeight: 700, color: '#F2F4F1' }}
                />
              </div>
              <div style={{ fontSize: 13.5, color: v.askHintC, marginTop: 10 }}>{v.askHint}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {v.sQuick.map((b, i) => (
                <button key={i} onClick={b.pick} className="hov-border-acc" style={{ flex: 1, minWidth: 120, padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#121514', textAlign: 'left', cursor: 'pointer', transition: 'border-color .2s' }}>
                  <div style={{ fontSize: 12, color: '#8C958F' }}>{b.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, marginTop: 2 }}>{b.v}</div>
                </button>
              ))}
            </div>

            <div style={{ ...CARD, padding: 22, borderRadius: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 40 }}>Where you sit in the market · size {v.sellSizeLabel}</div>
              <div style={{ position: 'relative', height: 6, borderRadius: 6, background: 'linear-gradient(90deg,rgba(255,255,255,0.08),rgba(75,255,139,0.3),rgba(255,255,255,0.08))', margin: '0 8px 44px' }}>
                {v.mkMarks.map((m, i) => (
                  <div key={i} style={{ position: 'absolute', left: m.left, top: -4, width: 2, height: 14, background: m.c }}>
                    <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', textAlign: 'center', fontSize: 11, color: '#8C958F' }}>
                      {m.l}
                      <div style={{ fontFamily: MONO, color: m.c, fontSize: 11.5 }}>{m.v}</div>
                    </div>
                  </div>
                ))}
                {v.sAsk && (
                  <div style={{ position: 'absolute', left: v.yourLeft, top: -10, width: 26, height: 26, marginLeft: -13, borderRadius: '50%', background: '#F2F4F1', border: '4px solid #0A0C0B', boxShadow: '0 0 0 2px #F2F4F1', transition: 'left .3s' }}>
                    <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 12, fontWeight: 700, background: '#F2F4F1', color: '#0A0C0B', padding: '3px 8px', borderRadius: 6 }}>
                      You · {v.askFmtS}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div style={CARD}>
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
              <div style={{ fontSize: 12.5, color: '#8C958F', marginTop: 10, lineHeight: 1.5 }}>Released to you once the buyer confirms delivery of the authenticated shirt.</div>
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
              background: `radial-gradient(circle at 50% 45%,${v.sShirt.glowA},rgba(0,0,0,0) 60%),#0D100F`,
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <ShirtGraphic hero pat={v.sShirt.pat} trim={v.sShirt.trim} crest={v.sShirt.crest} style={{ width: '66%', filter: 'drop-shadow(0 30px 30px rgba(0,0,0,0.6))' }} />
          </div>

          <div style={{ flex: '1 1 340px', minWidth: 0, ...CARD, display: 'flex', flexDirection: 'column' }}>
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
              disabled={v.sBusy}
              className="hov-primary"
              style={{ width: '100%', height: 58, marginTop: 18, borderRadius: 14, border: 0, background: '#4BFF8B', color: '#06110A', fontWeight: 700, fontSize: 16, cursor: v.sBusy ? 'progress' : 'pointer', opacity: v.sBusy ? 0.7 : 1, transition: 'box-shadow .2s,transform .15s' }}
            >
              {v.sBusy ? 'Publishing…' : 'Publish listing'}
            </button>
            <div style={{ fontSize: 12, color: '#8C958F', textAlign: 'center', marginTop: 10 }}>You’ll ship to our Zürich vault with a prepaid label once it sells.</div>
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
            disabled={v.nextDisabled}
            className="hov-next"
            style={{ height: 52, padding: '0 28px', borderRadius: 14, border: 0, background: '#F2F4F1', color: '#0A0C0B', fontWeight: 700, cursor: v.nextDisabled ? 'not-allowed' : 'pointer', opacity: v.nextDisabled ? 0.45 : 1, transition: 'background .2s' }}
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
            style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto 24px', background: 'rgba(75,255,139,0.12)', border: '2px solid #4BFF8B', display: 'grid', placeItems: 'center', boxShadow: '0 0 60px rgba(75,255,139,0.25)' }}
          >
            <div style={{ width: 32, height: 16, borderLeft: '5px solid #4BFF8B', borderBottom: '5px solid #4BFF8B', transform: 'rotate(-45deg) translate(2px,-4px)' }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(36px,5vw,56px)', fontWeight: 800, fontStretch: '72%', textTransform: 'uppercase', lineHeight: 0.95 }}>{v.pubTitle}</h1>
          <p style={{ color: '#C9D0CB', fontSize: 16, lineHeight: 1.55, margin: '14px 0 28px', textWrap: 'pretty' }}>{v.pubText}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={v.viewListing} style={{ height: 52, padding: '0 24px', borderRadius: 14, border: 0, background: '#4BFF8B', color: '#06110A', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              View shirt
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
