// The iOS app runs this same web app inside a native shell (Capacitor, ios/).
// Everything native goes through here and is loaded only inside the app, so
// the website never downloads a byte of it.

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
}

/** True inside the iOS app (the native shell injects window.Capacitor). */
export function isNative(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor?.isNativePlatform?.();
}

/**
 * Opens an external page (Stripe checkout, payout onboarding). In the app it
 * opens in an in-app browser sheet — leaving the app's web view would strand
 * the user on a website — and Stripe sends them back via maillot:// links.
 */
export async function openExternal(url: string): Promise<void> {
  if (!isNative()) {
    window.location.href = url;
    return;
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url, presentationStyle: 'popover', toolbarColor: '#0A0C0B' });
}

/** Turns maillot://orders?x=1 (or a link to our website) into an in-app path, or null. */
export function appPathFromUrl(raw: string, site?: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  let path: string;
  if (u.protocol === 'maillot:') path = '/' + u.host + u.pathname;
  else if (site && u.origin === new URL(site).origin) path = u.pathname;
  else return null;
  path = path.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1');
  // Only plain in-app paths: no scheme tricks, no protocol-relative URLs.
  if (!/^\/[\w\-./]*$/.test(path) || path.startsWith('//')) return null;
  return path + u.search;
}

/** Light haptic tick for meaningful moments (a match, a saved shirt). No-op on the web. */
export function haptic(kind: 'light' | 'success' = 'light'): void {
  if (!isNative()) return;
  void import('@capacitor/haptics').then(({ Haptics, ImpactStyle, NotificationType }) =>
    kind === 'success' ? Haptics.notification({ type: NotificationType.Success }) : Haptics.impact({ style: ImpactStyle.Light })
  );
}

/** Wires the native shell to the router: deep links, status bar, splash screen. */
export async function installNative(navigate: (to: string) => void, site: string): Promise<void> {
  if (!isNative()) return;
  document.documentElement.setAttribute('data-native', '');
  const [{ App }, { Browser }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/browser'),
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen')
  ]);
  await App.addListener('appUrlOpen', ({ url }) => {
    const path = appPathFromUrl(url, site);
    if (!path) return;
    void Browser.close().catch(() => {});
    navigate(path);
  });
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  await SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
}
