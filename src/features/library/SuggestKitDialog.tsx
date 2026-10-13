// A member suggests a kit that's missing from a club's library: season,
// kind, maker, sponsor, pattern and up to three colours, with a live
// preview. An admin checks it before it appears.
import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { KitClub } from '../../utils/db.ts';
import { Button, Dialog, Notice, ShirtGraphic, TextField } from '../../ui/index.ts';
import { KIT_KINDS, KIT_PATTERNS, kitLook, validSeason } from './model.ts';

export function SuggestKitDialog({ club, onClose }: { club: KitClub; onClose: () => void }) {
  const { t } = usePrefs();
  const toast = useToast();
  const [season, setSeason] = useState('');
  const [kind, setKind] = useState<string>('home');
  const [brand, setBrand] = useState('');
  const [sponsor, setSponsor] = useState('');
  const [pattern, setPattern] = useState<string>('plain');
  const [colors, setColors] = useState<string[]>(club.colors.map((c) => c.toUpperCase()));
  const [note, setNote] = useState('');
  const setColor = (i: number, v: string) =>
    setColors((cs) => {
      const next = [...cs];
      while (next.length < i) next.push('#FFFFFF');
      next[i] = v;
      return next.slice(0, 3);
    });
  const send = useMutation({
    mutationFn: () => db.suggestKit({ club: club.id, season: season.trim(), kind, brand, sponsor, pattern, colors, note }),
    onSuccess: () => {
      toast(t('lib.thanks'));
      onClose();
    }
  });
  const ok = validSeason(season);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ok) send.mutate();
  };
  const look = kitLook(pattern, colors);

  return (
    <Dialog open onClose={onClose} title={t('lib.suggestTitle', { club: club.name })} width={560}>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', gap: 14, alignItems: 'center' }}>
          <div aria-hidden="true" style={{ aspectRatio: '1/1', borderRadius: 14, background: 'var(--sunken)', display: 'grid', placeItems: 'center' }}>
            <ShirtGraphic {...look} flat style={{ width: '80%' }} />
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5 }}>{t('lib.suggestIntro')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <TextField label={t('lib.f.season')} value={season} onChange={(e) => setSeason(e.target.value.slice(0, 7))} placeholder="2025/26" required style={{ flex: '1 1 120px' }} error={season && !ok ? t('lib.f.seasonHint') : undefined} />
          <div style={{ flex: '1 1 160px' }}>
            <label htmlFor="kit-kind" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              {t('lib.f.kind')}
            </label>
            <div className="field">
              <select id="kit-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                {KIT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t('lib.kind.' + k)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <TextField label={t('lib.f.brand')} value={brand} onChange={(e) => setBrand(e.target.value.slice(0, 40))} placeholder="adidas" style={{ flex: '1 1 160px' }} />
          <TextField label={t('lib.f.sponsor')} value={sponsor} onChange={(e) => setSponsor(e.target.value.slice(0, 60))} style={{ flex: '1 1 160px' }} />
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t('lib.f.pattern')}</legend>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {KIT_PATTERNS.map((p) => (
              <button key={p} type="button" className="option-btn" aria-pressed={pattern === p} onClick={() => setPattern(p)} style={{ padding: '7px 12px', fontSize: 13 }}>
                {t('lib.pattern.' + p)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t('lib.f.colors')}</legend>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {[0, 1, 2].map((i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="color" value={colors[i] ?? '#FFFFFF'} onChange={(e) => setColor(i, e.target.value.toUpperCase())} aria-label={t('lib.f.colorN', { n: i + 1 })} style={{ width: 40, height: 32, border: 0, background: 'none', padding: 0 }} />
                {i === 0 ? t('lib.f.main') : t('lib.f.colorN', { n: i + 1 })}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="kit-note" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            {t('lib.f.note')}
          </label>
          <textarea id="kit-note" value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} rows={2} placeholder={t('lib.f.notePh')} style={{ width: '100%', padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)', fontSize: 14, resize: 'vertical' }} />
        </div>
        {send.isError && <Notice tone="neg">{(send.error as { code?: string })?.code === 'P0429' ? t('lib.limited') : t('lib.failed')}</Notice>}
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!ok} busy={send.isPending} style={{ flex: 1.4 }}>
            {t('lib.send')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
