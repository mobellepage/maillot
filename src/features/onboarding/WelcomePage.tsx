// /welcome — three quick questions after the first sign-in: what brings you
// here, what you collect, and (optionally) a public username. Every step can
// be skipped; answering personalises "Recommended for you" and where we send
// you next.
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { SHIRTS } from '../../data.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { Button, TextField } from '../../ui/index.ts';

const GOALS = ['collect', 'buy', 'sell'] as const;

const NEXT: Record<string, { to: string; label: string }> = {
  collect: { to: '/vault/add', label: 'wel.next.collect' },
  sell: { to: '/sell', label: 'wel.next.sell' },
  buy: { to: '/market', label: 'wel.next.buy' }
};

function Chips({ options, value, onChange, label, display }: { options: string[]; value: string[]; onChange: (v: string[]) => void; label: string; display: (v: string) => string }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" className="option-btn" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} style={{ padding: '9px 14px', fontSize: 13.5 }}>
            {display(o)}
          </button>
        );
      })}
    </div>
  );
}

export default function WelcomePage() {
  useCatalog();
  const { t, label } = usePrefs();
  usePageMeta(t('wel.meta'));
  const { user, profile } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const nav = useNavigate();
  const from = ((useLocation().state || {}) as { from?: string }).from;
  // ?step=username jumps straight to the username (from "Choose a username").
  const [params] = useSearchParams();
  const [step, setStep] = useState(params.get('step') === 'username' ? 2 : 0);
  const [goals, setGoals] = useState<string[]>([]);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [handle, setHandle] = useState('');
  const [handleState, setHandleState] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle');
  const [busy, setBusy] = useState(false);

  const leagueOptions = [...new Set(SHIRTS.map((s) => s.league))].sort();
  const typeOptions = [...new Set(SHIRTS.map((s) => s.type))];

  // Debounced availability check while typing a username.
  useEffect(() => {
    const h = handle.trim();
    if (!h) return;
    if (!/^[a-z0-9_]{3,20}$/.test(h)) {
      const t = setTimeout(() => setHandleState('invalid'), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setHandleState('checking');
      db.isHandleAvailable(h)
        .then((ok) => setHandleState(ok ? 'ok' : 'taken'))
        .catch(() => setHandleState('idle'));
    }, 350);
    return () => clearTimeout(t);
  }, [handle]);

  if (!user) return null;

  const finish = async (skipAll = false) => {
    setBusy(true);
    try {
      await db.saveOnboarding(user.id, {
        goals: skipAll ? [] : goals,
        interests: skipAll ? { leagues: [], types: [] } : { leagues, types },
        handle: !skipAll && handleState === 'ok' ? handle.trim() : null
      });
    } catch {
      toast(t('wel.saveFailed'));
    }
    await qc.invalidateQueries({ queryKey: ['profile', user.id] });
    setBusy(false);
    const first = goals.find((g) => NEXT[g]);
    nav(skipAll ? from || '/' : first ? NEXT[first]!.to : from || '/', { replace: true });
  };

  const handleHint = t('wel.h.' + handleState);

  return (
    <main id="main" style={{ maxWidth: 620, margin: '0 auto', padding: 'clamp(40px,7vw,72px) var(--gutter) 100px', animation: 'kvIn .4s ease both' }}>
      <div className="eyebrow">
        {t('wel.step', { n: step + 1 })}
      </div>
      <div aria-hidden="true" style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--line-strong)', transition: 'background .3s' }} />
        ))}
      </div>

      {step === 0 && (
        <section aria-labelledby="w-goals">
          <h1 id="w-goals" className="display" style={{ marginTop: 22, fontSize: 'clamp(26px,4vw,36px)' }}>
            {t('wel.q1')}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, margin: '10px 0 20px' }}>{t('wel.q1b')}</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {GOALS.map((g) => {
              const on = goals.includes(g);
              return (
                <button key={g} type="button" className="option-btn" aria-pressed={on} onClick={() => setGoals(on ? goals.filter((x) => x !== g) : [...goals, g])} style={{ textAlign: 'left', padding: '16px 18px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15.5 }}>{t('wel.goal.' + g)}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 4 }}>{t('wel.goal.' + g + '.b')}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="w-interests">
          <h1 id="w-interests" className="display" style={{ marginTop: 22, fontSize: 'clamp(26px,4vw,36px)' }}>
            {t('wel.q2')}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, margin: '10px 0 20px' }}>{t('wel.q2b')}</p>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px' }}>{t('wel.kind')}</h2>
          <Chips label={t('wel.kind')} options={typeOptions} value={types} onChange={setTypes} display={(v) => label('type', v)} />
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: '22px 0 10px' }}>{t('wel.leagues')}</h2>
          <Chips label={t('wel.leagues')} options={leagueOptions} value={leagues} onChange={setLeagues} display={(v) => label('league', v)} />
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="w-handle">
          <h1 id="w-handle" className="display" style={{ marginTop: 22, fontSize: 'clamp(26px,4vw,36px)' }}>
            {t('wel.q3')}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, margin: '10px 0 20px' }}>{t('wel.q3b')}</p>
          <TextField
            label={t('wel.username')}
            value={handle}
            onChange={(e) => {
              const v = e.target.value.toLowerCase().slice(0, 20);
              setHandle(v);
              if (!v) setHandleState('idle');
            }}
            adornment={<span style={{ color: 'var(--muted)', paddingLeft: 4 }}>@</span>}
            hint={handleHint}
            error={handleState === 'taken' || handleState === 'invalid' ? handleHint : undefined}
            autoCapitalize="none"
            spellCheck={false}
            placeholder={profile?.handle ?? t('wel.ph')}
          />
        </section>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 30, flexWrap: 'wrap' }}>
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            {t('wel.back')}
          </Button>
        )}
        <div style={{ flex: 1 }} />
        <Button variant="ghost" disabled={busy} onClick={() => finish(true)}>
          {t('wel.skip')}
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep(step + 1)}>{t('wel.continue')}</Button>
        ) : (
          <Button busy={busy} busyLabel={t('wel.saving')} disabled={handleState === 'checking' || handleState === 'taken' || handleState === 'invalid'} onClick={() => finish()}>
            {goals.find((g) => NEXT[g]) ? t(NEXT[goals.find((g) => NEXT[g])!]!.label) : t('wel.start')}
          </Button>
        )}
      </div>
    </main>
  );
}
