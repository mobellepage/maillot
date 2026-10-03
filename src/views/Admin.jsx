import { useState } from 'react';

const MONO = "'JetBrains Mono',monospace";
const ACC = '#4BFF8B';

function ApiKeysPanel({ v }) {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    await v.apiKeyCreate(label.trim());
    setBusy(false);
    setLabel('');
  };

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4BFF8B' }}>Daten-Produkt</div>
      <h2 style={{ margin: '6px 0 0', fontSize: 'clamp(20px,2.6vw,26px)', fontWeight: 800, fontStretch: '76%', textTransform: 'uppercase' }}>Price-Index API-Schlüssel</h2>
      <div style={{ fontSize: 13, color: '#8C958F', marginTop: 8, lineHeight: 1.5, maxWidth: 560 }}>
        Lizenzierbarer Preisindex (GET price-index?shirt_id=... mit x-api-key Header). Schlüssel werden nur als Hash gespeichert — der Klartext wird genau einmal nach dem Erstellen angezeigt.
      </div>

      {v.newApiKey && (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: 'rgba(75,255,139,0.08)', border: '1px solid rgba(75,255,139,0.3)' }}>
          <div style={{ fontSize: 12.5, color: '#C9D0CB' }}>Neuer Schlüssel — jetzt kopieren, wird nicht wieder angezeigt:</div>
          <div style={{ fontFamily: MONO, fontSize: 13, marginTop: 8, wordBreak: 'break-all', color: ACC }}>{v.newApiKey.plaintext}</div>
          <button
            onClick={v.newApiKey.dismiss}
            style={{ marginTop: 10, height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontSize: 12.5, cursor: 'pointer' }}
          >
            Verstanden, ausblenden
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Bezeichnung (z.B. „Partner X“)"
          style={{ flex: '1 1 220px', height: 42, padding: '0 14px', borderRadius: 10, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 13, color: '#F2F4F1' }}
        />
        <button
          onClick={create}
          disabled={busy}
          style={{ height: 42, padding: '0 18px', borderRadius: 10, border: 0, background: ACC, color: '#06110A', fontWeight: 700, fontSize: 13.5, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          Schlüssel erstellen
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {v.apiKeys.length === 0 && <div style={{ fontSize: 13, color: '#8C958F' }}>Noch keine Schlüssel ausgestellt.</div>}
        {v.apiKeys.map((k) => (
          <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#101312', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{k.label}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#8C958F', marginTop: 2 }}>{k.prefix}… · erstellt {k.createdLabel} · zuletzt genutzt {k.lastUsedLabel}</div>
            </div>
            {k.revoked ? (
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#8C958F' }}>Widerrufen</span>
            ) : (
              <button
                onClick={k.revoke}
                style={{ height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,107,94,0.4)', background: 'none', color: '#FF6B5E', fontSize: 12.5, cursor: 'pointer' }}
              >
                Widerrufen
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ item }) {
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  return (
    <div style={{ padding: 20, borderRadius: 18, background: '#101312', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{item.name}</div>
          <div style={{ fontSize: 12.5, color: '#8C958F', marginTop: 2 }}>
            {item.version} · {item.sizeLine}
          </div>
        </div>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            padding: '4px 10px',
            borderRadius: 999,
            background: item.statusLabel === 'Neu' ? 'rgba(75,255,139,0.12)' : 'rgba(111,182,255,0.12)',
            color: item.statusLabel === 'Neu' ? ACC : '#6FB6FF'
          }}
        >
          {item.statusLabel}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 14, fontSize: 13, color: '#C9D0CB' }}>
        <div>Zustand: {item.conditionLine}</div>
        <div>Flock: {item.flockLine}</div>
        <div>Patches: {item.patchesLine}</div>
        <div>Signatur: {item.signatureLine}</div>
        <div>Provenienz: {item.provenance}</div>
      </div>

      {item.precheck && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            fontSize: 12.5,
            lineHeight: 1.4,
            color: '#C9D0CB',
            background: item.precheck.status === 'ok' ? 'rgba(75,255,139,0.06)' : item.precheck.status === 'review' ? 'rgba(232,176,75,0.06)' : 'rgba(255,107,94,0.06)',
            border: `1px solid ${item.precheck.status === 'ok' ? 'rgba(75,255,139,0.2)' : item.precheck.status === 'review' ? 'rgba(232,176,75,0.25)' : 'rgba(255,107,94,0.25)'}`
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#8C958F', marginBottom: 4 }}>AUTOMATISCHE VORPRÜFUNG</div>
          {item.precheck.notes.map((n, i) => (
            <div key={i}>· {n}</div>
          ))}
        </div>
      )}

      {item.photos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, overflowX: 'auto', paddingBottom: 4 }}>
          {item.photos.map((p) => (
            <div key={p.key} style={{ flex: 'none', textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 10, background: `url(${p.url}) center/cover`, border: '1px solid rgba(255,255,255,0.1)' }} />
              <div style={{ fontSize: 9.5, color: '#8C958F', marginTop: 4, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: '#6F7872', marginTop: 12 }}>Angefragt: {item.submittedLabel}</div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button
          onClick={item.approve}
          style={{ height: 42, padding: '0 18px', borderRadius: 10, border: 0, background: ACC, color: '#06110A', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
        >
          Verifizieren
        </button>
        {!showReject && (
          <button
            onClick={() => setShowReject(true)}
            style={{ height: 42, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(255,107,94,0.4)', background: 'none', color: '#FF6B5E', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}
          >
            Ablehnen
          </button>
        )}
      </div>

      {showReject && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ablehnungsgrund (optional)"
            style={{ flex: '1 1 220px', height: 40, padding: '0 12px', borderRadius: 10, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 13, color: '#F2F4F1' }}
          />
          <button
            onClick={() => item.reject(reason)}
            style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 0, background: '#FF6B5E', color: '#1A0908', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Bestätigen
          </button>
        </div>
      )}
    </div>
  );
}

export default function Admin({ v }) {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(28px,4vw,48px) clamp(16px,4vw,40px) 100px', animation: 'kvIn .4s ease both' }}>
      <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4BFF8B' }}>Intern</div>
      <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(26px,3.6vw,38px)', fontWeight: 800, fontStretch: '72%', textTransform: 'uppercase', lineHeight: 1 }}>
        Prüfungs-Warteschlange
      </h1>
      <div style={{ fontSize: 13.5, color: '#8C958F', marginTop: 10, lineHeight: 1.5, maxWidth: 560 }}>
        Echte Warteschlange: Trikots landen hier, sobald jemand im Formular „Verifizierung anfragen“ klickt. Nichts löst sich selbst auf — ein Mensch muss hier verifizieren oder ablehnen.
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        {v.adminStats.map((st) => (
          <div key={st.label} style={{ flex: '1 1 110px', padding: '12px 16px', borderRadius: 14, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: st.color }}>{st.n}</div>
            <div style={{ fontSize: 11.5, color: '#8C958F', marginTop: 2 }}>{st.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 28 }}>
        {v.adminEmpty && <div style={{ fontSize: 14, color: '#8C958F', padding: '32px 0' }}>Keine offenen Prüfungen.</div>}
        {v.adminQueue.map((item) => (
          <ReviewCard key={item.id} item={item} />
        ))}
      </div>

      {v.adminHistory.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#C9D0CB' }}>Zuletzt entschieden</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {v.adminHistory.map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#101312', border: '1px solid rgba(255,255,255,0.06)', fontSize: 12.5 }}>
                <span style={{ color: '#C9D0CB' }}>{h.name}</span>
                <span style={{ color: h.status === 'approved' ? ACC : '#FF6B5E', fontFamily: MONO, fontSize: 11 }}>{h.statusLabel}</span>
                <span style={{ color: '#6F7872', fontFamily: MONO, fontSize: 10.5 }}>{h.when}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ApiKeysPanel v={v} />

      <button onClick={v.adminBack} style={{ marginTop: 32, height: 48, padding: '0 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontWeight: 600, cursor: 'pointer' }}>
        ← Zurück zur Sammlung
      </button>
    </main>
  );
}
