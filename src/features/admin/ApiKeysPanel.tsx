import { useState } from 'react';
import { formatDate } from '../../lib/format.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Button, Notice, SectionHeader, TextField } from '../../ui/index.ts';
import { useApiKeyActions, useApiKeys } from './queries.ts';

export function ApiKeysPanel() {
  const { lang } = usePrefs();
  const keys = useApiKeys().data ?? [];
  const { create, revoke } = useApiKeyActions();
  const [label, setLabel] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  return (
    <section aria-labelledby="keys-title" style={{ marginTop: 48 }}>
      <SectionHeader id="keys-title" eyebrow="Data product" title="Price-index API keys" size="sm" />
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '-12px 0 0', lineHeight: 1.5, maxWidth: 560 }}>
        Licensed price index (<code>GET /functions/v1/price-index?shirt_id=…</code> with an <code>x-api-key</code> header). Keys are stored only as a hash — the plaintext is shown exactly once.
      </p>
      {fresh && (
        <Notice tone="accent" style={{ marginTop: 16 }}>
          New key — copy it now, it won’t be shown again:
          <div className="mono" style={{ fontSize: 13, marginTop: 8, wordBreak: 'break-all' }}>
            {fresh}
          </div>
          <Button size="sm" variant="ghost" style={{ marginTop: 10 }} onClick={() => setFresh(null)}>
            Done, hide it
          </Button>
        </Notice>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(label.trim(), { onSuccess: (k) => (k && setFresh(k.plaintext_key), setLabel('')) });
        }}
        style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}
      >
        <TextField srLabel="Key label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. “Partner X”)" style={{ flex: '1 1 220px' }} />
        <Button type="submit" size="sm" busy={create.isPending} style={{ height: 50 }}>
          Create key
        </Button>
      </form>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0 0' }}>
        {!keys.length && <li style={{ fontSize: 13, color: 'var(--muted)' }}>No keys issued yet.</li>}
        {keys.map((k) => (
          <li key={k.id} className="card card--tight" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{k.label}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {k.key_prefix}… · created {formatDate(k.created_at, lang)} · last used {k.last_used_at ? formatDate(k.last_used_at, lang, true) : 'never'}
              </div>
            </div>
            {k.revoked_at ? (
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                Revoked
              </span>
            ) : (
              <Button size="sm" variant="danger" disabled={revoke.isPending} onClick={() => revoke.mutate(k.id)}>
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
