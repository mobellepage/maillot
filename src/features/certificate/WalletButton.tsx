// "Add to Apple Wallet" for a valid certificate. Shown only on Apple devices
// (and in the iOS app) and only once the pass service is switched on. In the
// app the pass opens in the in-app browser, which hands it to Wallet.
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { isNative, openExternal } from '../../lib/native.ts';

const PASS_URL = (import.meta.env.VITE_SUPABASE_URL ?? '') + '/functions/v1/wallet-pass';

const onApple = () => typeof navigator !== 'undefined' && (isNative() || /iPhone|iPad|Macintosh/.test(navigator.userAgent));

export function WalletButton({ code }: { code: string }) {
  const { t } = usePrefs();
  const probe = useQuery({
    queryKey: ['walletPassConfigured'],
    queryFn: async () => ((await (await fetch(PASS_URL + '?probe=1')).json()) as { configured?: boolean }).configured === true,
    enabled: onApple(),
    staleTime: Infinity,
    retry: false
  });
  if (!probe.data) return null;
  const href = `${PASS_URL}?code=${encodeURIComponent(code)}`;
  return (
    <a
      href={href}
      onClick={(e) => {
        if (!isNative()) return;
        e.preventDefault();
        void openExternal(href);
      }}
      className="wallet-btn"
      aria-label={t('ver.addToWallet')}
    >
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2.5" y="4.5" width="19" height="15" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2.5 9h19M2.5 12.5h19" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      {t('ver.addToWallet')}
    </a>
  );
}
