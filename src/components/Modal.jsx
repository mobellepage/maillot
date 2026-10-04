import { CLIP } from './ShirtGraphic.jsx';

export default function Modal({ v }) {
  if (!v.modalOpen) return null;
  const d = v.d;
  return (
    <div
      onClick={v.closeModal}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(4,6,5,0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: v.modalAlign,
        justifyContent: 'center',
        padding: v.modalPad,
        animation: 'kvIn .25s ease both'
      }}
    >
      <div
        onClick={v.stop}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '92vh',
          overflow: 'auto',
          background: '#121514',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: v.modalRadius,
          padding: 28,
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)'
        }}
      >
        {v.modalNotDone && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 800, fontStretch: '82%', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
                {v.modalTitle}
              </div>
              <button
                onClick={v.closeModal}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#C9D0CB',
                  fontSize: 18
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                padding: 14,
                borderRadius: 16,
                background: '#0D100F',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: 22
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none',
                  background: `radial-gradient(circle,${d.glowA},rgba(0,0,0,0) 70%),#0A0C0B`
                }}
              >
                <div style={{ position: 'relative', width: '80%', aspectRatio: '1/1' }}>
                  <div style={{ position: 'absolute', inset: 0, clipPath: CLIP, background: d.pat }} />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      clipPath: CLIP,
                      background:
                        'linear-gradient(90deg,rgba(0,0,0,0.32),rgba(0,0,0,0) 24%,rgba(255,255,255,0.07) 50%,rgba(0,0,0,0) 76%,rgba(0,0,0,0.32))'
                    }}
                  />
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{d.name}</div>
                <div style={{ fontFamily: "'JetBrains Mono Variable','JetBrains Mono',monospace", fontSize: 12, color: '#8C958F', marginTop: 4 }}>
                  Size {v.sizeSel} · {d.cond}
                </div>
              </div>
            </div>

            {v.isBuy && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
                  {v.buyRows.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#C9D0CB' }}>
                      <span>{r.k}</span>
                      <span style={{ fontFamily: "'JetBrains Mono Variable','JetBrains Mono',monospace", color: '#F2F4F1' }}>{r.v}</span>
                    </div>
                  ))}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 600 }}>Total</span>
                    <span style={{ fontFamily: "'JetBrains Mono Variable','JetBrains Mono',monospace", fontSize: 22, fontWeight: 700 }}>{v.buyTotal}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 20, padding: 14, borderRadius: 14, background: '#0D100F', border: '1px solid rgba(255,255,255,0.07)', fontSize: 13, lineHeight: 1.5, color: '#C9D0CB' }}>
                  <span style={{ color: '#4BFF8B', fontWeight: 700 }}>✓</span>
                  <span>
                    Pay securely with TWINT, card or Apple Pay on the next step. Your money is held in escrow and only released once the shirt has passed authentication
                    and you confirm delivery.{' '}
                    <button onClick={v.goAuthInfo} style={{ padding: 0, border: 0, background: 'none', color: '#4BFF8B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      How authentication works
                    </button>
                  </span>
                </div>
                <button
                  onClick={v.confirmModal}
                  className="hov-primary"
                  style={{
                    width: '100%',
                    height: 56,
                    marginTop: 22,
                    borderRadius: 14,
                    border: 0,
                    background: '#4BFF8B',
                    color: '#06110A',
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: 'pointer',
                    transition: 'transform .15s,box-shadow .2s'
                  }}
                >
                  {v.modalBusy ? 'Matching…' : 'Confirm purchase · ' + v.buyTotal}
                </button>
              </>
            )}

            {v.isBid && (
              <>
                <div
                  style={{
                    fontSize: 12,
                    color: '#8C958F',
                    marginBottom: 8,
                    fontFamily: "'JetBrains Mono Variable','JetBrains Mono',monospace",
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}
                >
                  Your bid
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    height: 72,
                    padding: '0 20px',
                    borderRadius: 16,
                    background: '#0D100F',
                    border: '1.5px solid rgba(75,255,139,0.45)'
                  }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono Variable','JetBrains Mono',monospace", color: '#8C958F', fontSize: 18 }}>CHF</span>
                  <input
                    value={v.bidAmt}
                    onChange={v.onBidAmt}
                    inputMode="numeric"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'none',
                      border: 0,
                      outline: 'none',
                      fontFamily: "'JetBrains Mono Variable','JetBrains Mono',monospace",
                      fontSize: 32,
                      fontWeight: 700,
                      color: '#F2F4F1'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {v.bidQuick.map((b, i) => (
                    <button
                      key={i}
                      onClick={b.pick}
                      className="hov-border-acc"
                      style={{
                        flex: 1,
                        minWidth: 110,
                        padding: 10,
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: '#161A18',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color .2s'
                      }}
                    >
                      <div style={{ fontSize: 11, color: '#8C958F' }}>{b.k}</div>
                      <div style={{ fontFamily: "'JetBrains Mono Variable','JetBrains Mono',monospace", fontSize: 14, fontWeight: 600, marginTop: 2 }}>{b.v}</div>
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#8C958F',
                    margin: '20px 0 10px',
                    fontFamily: "'JetBrains Mono Variable','JetBrains Mono',monospace",
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}
                >
                  Bid expires in
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {v.expOpts.map((x, i) => (
                    <button
                      key={i}
                      onClick={x.pick}
                      style={{
                        flex: 1,
                        height: 42,
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        background: x.bg,
                        border: `1.5px solid ${x.border}`,
                        color: '#F2F4F1'
                      }}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: v.bidHintColor, marginTop: 16, lineHeight: 1.45 }}>{v.bidHint}</div>
                <button
                  onClick={v.confirmModal}
                  className="hov-primary"
                  style={{
                    width: '100%',
                    height: 56,
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
                  {v.modalBusy ? 'Placing bid…' : 'Place bid · ' + v.bidFmt}
                </button>
              </>
            )}
          </>
        )}

        {v.modalDone && (
          <div style={{ textAlign: 'center', padding: '12px 4px 4px' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                margin: '0 auto 18px',
                background: 'rgba(75,255,139,0.12)',
                border: '2px solid #4BFF8B',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 13,
                  borderLeft: '4px solid #4BFF8B',
                  borderBottom: '4px solid #4BFF8B',
                  transform: 'rotate(-45deg) translate(2px,-3px)'
                }}
              />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, fontStretch: '82%', textTransform: 'uppercase' }}>{v.doneTitle}</div>
            <p style={{ color: '#C9D0CB', fontSize: 14.5, lineHeight: 1.55, margin: '10px 0 24px', textWrap: 'pretty' }}>{v.doneText}</p>
            {v.doneMatched && (
              <button
                onClick={v.donePay}
                className="hov-primary"
                style={{ width: '100%', height: 56, marginBottom: 10, borderRadius: 14, border: 0, background: '#4BFF8B', color: '#06110A', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
              >
                Pay now
              </button>
            )}
            <button
              onClick={v.closeModal}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.14)',
                background: '#1A1F1C',
                color: '#F2F4F1',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer'
              }}
            >
              {v.doneMatched ? 'Pay later from Orders' : 'Done'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
