// Who sees one shirt of your collection — changeable at any time from the
// shirt's page. A private collection (profile setting) hides every shirt
// regardless; then this says so.
import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { VISIBILITIES } from '../../addShirtData.js';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { CustomItem, Visibility } from '../../types/domain.ts';
import { Button, Card } from '../../ui/index.ts';

export function VisibilityEditor({ item }: { item: CustomItem }) {
  const { t } = usePrefs();
  const { user, profile } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const [price, setPrice] = useState(item.salePrice || '');
  const save = useMutation({
    mutationFn: (v: Visibility) => db.setItemVisibility(item.id, v, price),
    onSuccess: () => {
      toast(t('vault.visSaved'));
      qc.invalidateQueries({ queryKey: ['customItems', user?.id] });
    },
    onError: () => toast(t('vault.saveFailed'))
  });
  const inquiries = useMutation({
    mutationFn: (on: boolean) => db.setInquiriesEnabled(item.id, on),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customItems', user?.id] }),
    onError: () => toast(t('vault.saveFailed'))
  });
  const options = VISIBILITIES as { key: Visibility; label: string; desc: string }[];
  return (
    <Card tight style={{ marginTop: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t('vault.f.visibility')}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {options.map((o) => (
          <button key={o.key} type="button" className="option-btn" aria-pressed={item.visibility === o.key} disabled={save.isPending} onClick={() => o.key !== item.visibility && (o.key !== 'forsale' || price) && save.mutate(o.key)} style={{ padding: 12 }}>
            <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{t(o.label)}</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{t(o.desc)}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <input
          aria-label={t('as.f.price')}
          inputMode="numeric"
          className="input"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder={t('vault.salePrice')}
          style={{ flex: 1, minWidth: 0, height: 40, padding: '0 12px', borderRadius: 10, background: 'var(--sunken)', border: '1px solid var(--line)', color: 'var(--text)' }}
        />
        <Button size="sm" variant="secondary" disabled={!price || save.isPending} onClick={() => save.mutate('forsale')}>
          {t('vault.setForSale')}
        </Button>
      </div>
      {item.visibility === 'public' && (
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 12, fontSize: 13.5, cursor: 'pointer' }}>
          <input type="checkbox" checked={item.inquiriesEnabled !== false} disabled={inquiries.isPending} onChange={(e) => inquiries.mutate(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, accentColor: 'var(--accent)' }} />
          <span>
            <span style={{ display: 'block', fontWeight: 600 }}>{t('inq.allow')}</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{t('inq.allowHint')}</span>
          </span>
        </label>
      )}
      {profile?.collectionPrivate && (
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.45 }}>
          {t('vault.collectionPrivateNote')} <Link to="/account">{t('vault.changeInProfile')}</Link>
        </p>
      )}
    </Card>
  );
}
