// /account — everything about "me" in one place, and the only place on a
// phone (and in the iOS app) to change language/currency, sign out or delete
// the account. Signed out, it keeps the display settings and a way in.
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { Currency } from '../../utils/currency.ts';
import type { Lang } from '../../i18n/index.ts';
import { Button, ButtonLink, Card, Notice, Page } from '../../ui/index.ts';
import { useConfirm } from '../../ui/Confirm.tsx';
import { PayoutsCard } from '../vault/PayoutsCard.tsx';
import { ProfileCard } from '../collectors/ProfileCard.tsx';

declare const __RELEASE__: string;
const RELEASE = typeof __RELEASE__ === 'string' ? __RELEASE__ : 'dev';
const LANG_NAMES: Record<Lang, string> = { en: 'English', de: 'Deutsch', fr: 'Français' };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: '1px solid var(--line)' }}>
      <span style={{ fontSize: 14.5 }}>{label}</span>
      {children}
    </div>
  );
}

function Settings() {
  const { t, lang, setLang, langs, currency, setCurrency, currencies } = usePrefs();
  return (
    <Card>
      <h2 style={{ fontSize: 17, marginBottom: 6 }}>{t('acct.display')}</h2>
      <Row label={t('header.language')}>
        <select className="select" aria-label={t('header.language')} value={lang} onChange={(e) => setLang(e.target.value as Lang)} style={{ width: 'auto' }}>
          {langs.map((l) => (
            <option key={l} value={l}>
              {LANG_NAMES[l]}
            </option>
          ))}
        </select>
      </Row>
      <Row label={t('header.currency')}>
        <select className="select" aria-label={t('header.currency')} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} style={{ width: 'auto' }}>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Row>
    </Card>
  );
}

function Links() {
  const { t } = usePrefs();
  const links = [
    ['/help', 'footer.help'],
    ['/authentication', 'footer.howAuth'],
    ['/verify', 'footer.verify'],
    ['/legal/terms', 'footer.terms'],
    ['/legal/privacy', 'footer.privacy'],
    ['/legal/imprint', 'footer.imprint']
  ] as const;
  return (
    <Card tight>
      <nav aria-label={t('legal.nav')}>
        {links.map(([to, key], i) => (
          <Link key={to} to={to} className="row-btn" style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 4px', borderTop: i ? '1px solid var(--line)' : 0, color: 'var(--text)' }}>
            {t(key)}
            <span aria-hidden="true" style={{ color: 'var(--muted)' }}>
              →
            </span>
          </Link>
        ))}
      </nav>
    </Card>
  );
}

function DeleteAccount() {
  const { t, tp } = usePrefs();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(null);
  const blockers = useQuery({ queryKey: ['deletionBlockers'], queryFn: db.accountDeletionBlockers, enabled: false });
  const del = useMutation({
    mutationFn: db.deleteAccount,
    onSuccess: (r) => {
      if (r.deleted) {
        toast(t('acct.deleted'));
        navigate('/', { replace: true });
      } else if (r.reason === 'open_orders') void blockers.refetch().then((b) => setOpen(b.data ?? 1));
      else toast(t('acct.deleteFailed'));
    },
    onError: () => toast(t('acct.deleteFailed'))
  });

  const start = async () => {
    const n = (await blockers.refetch()).data ?? 0;
    setOpen(n);
    if (n > 0) return;
    const ok = await confirm({ title: t('acct.deleteTitle'), body: t('acct.deleteBody'), confirmLabel: t('acct.deleteConfirm'), tone: 'danger' });
    if (ok) del.mutate();
  };

  return (
    <Card>
      <h2 style={{ fontSize: 17 }}>{t('acct.deleteHeading')}</h2>
      <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.55, margin: '8px 0 16px' }}>{t('acct.deleteIntro')}</p>
      {open !== null && open > 0 && (
        <Notice tone="warn" style={{ marginBottom: 16 }}>
          {tp('acct.openOrders', open)} <Link to="/orders">{t('acct.toOrders')}</Link>
        </Notice>
      )}
      <Button variant="danger" busy={del.isPending || blockers.isFetching} busyLabel={t('acct.deleting')} onClick={start}>
        {t('acct.deleteButton')}
      </Button>
    </Card>
  );
}

export default function AccountPage() {
  const { t } = usePrefs();
  usePageMeta(t('acct.title'));
  const { user, profile, signOut } = useSession();
  const toast = useToast();
  const navigate = useNavigate();

  return (
    <Page narrow>
      <h1 className="display display--lg">{t('acct.title')}</h1>
      <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        {user ? (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid var(--accent)', background: 'var(--avatar-grad)', display: 'grid', placeItems: 'center', fontWeight: 700, flex: 'none' }}>
                {(profile?.handle || user.email || '?').slice(0, 2).toUpperCase()}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{profile?.handle ? '@' + profile.handle : t('acct.noHandle')}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              {profile?.handle ? (
                <ButtonLink to={'/u/' + profile.handle} variant="secondary" size="sm">
                  {t('acct.publicProfile')}
                </ButtonLink>
              ) : (
                <ButtonLink to="/welcome?step=username" variant="secondary" size="sm">
                  {t('acct.pickHandle')}
                </ButtonLink>
              )}
              <ButtonLink to="/vault" variant="ghost" size="sm">
                {t('header.myCollection')}
              </ButtonLink>
              <ButtonLink to="/orders" variant="ghost" size="sm">
                {t('vault.title.orders')}
              </ButtonLink>
            </div>
          </Card>
        ) : (
          <Card>
            <p style={{ color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 16 }}>{t('acct.signedOut')}</p>
            <ButtonLink to="/signin" block>
              {t('header.signin')}
            </ButtonLink>
          </Card>
        )}
        <ProfileCard />
        <Settings />
        {user && <PayoutsCard />}
        <Links />
        {user && (
          <>
            <Button
              variant="secondary"
              block
              onClick={async () => {
                await signOut();
                toast(t('toast.signedOut'));
                navigate('/');
              }}
            >
              {t('header.signout')}
            </Button>
            <DeleteAccount />
          </>
        )}
        <p className="mono" style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
          MAILLOT · {RELEASE}
        </p>
      </div>
    </Page>
  );
}
