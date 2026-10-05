// Minimal, dependency-free i18n: a flat key -> {en, de} dictionary.
// Scope is deliberately bounded to the app's global chrome and account/order
// flows (header, mobile nav, sign-in screen, order status/actions/toasts) —
// the surfaces every visitor sees regardless of which view they're browsing,
// and the ones that were already hardcoded in German-only before this file
// existed. Product/browsing copy (Home, Browse, Sell, AddShirt, Admin) is
// intentionally left as-is for now; any string can be migrated into DICT and
// wrapped in t(...) incrementally later.
export const LANGS = ['en', 'de'] as const;
export type Lang = (typeof LANGS)[number];

const DICT: Record<string, Partial<Record<Lang, string>> & { en: string }> = {
  'nav.discover': { en: 'Discover', de: 'Entdecken' },
  'nav.marketplace': { en: 'Marketplace', de: 'Marktplatz' },
  'nav.marketShort': { en: 'Market', de: 'Markt' },
  'nav.sell': { en: 'Sell', de: 'Verkaufen' },
  'nav.collection': { en: 'My Collection', de: 'Meine Sammlung' },
  'nav.collectionShort': { en: 'Collection', de: 'Sammlung' },
  'nav.admin': { en: 'Admin', de: 'Admin' },

  'header.search': { en: 'Search shirts, clubs, players', de: 'Trikots, Vereine, Spieler suchen' },
  'header.signin': { en: 'Sign in', de: 'Anmelden' },
  'header.signout': { en: 'Sign out', de: 'Abmelden' },
  'header.notifications': { en: 'Notifications', de: 'Benachrichtigungen' },
  'header.noNotifications': { en: 'No notifications yet.', de: 'Noch keine Benachrichtigungen.' },

  'auth.account': { en: 'Account', de: 'Konto' },
  'auth.signin': { en: 'Sign in', de: 'Anmelden' },
  'auth.createAccount': { en: 'Create account', de: 'Konto erstellen' },
  'auth.email': { en: 'Email', de: 'E-Mail' },
  'auth.password': { en: 'Password', de: 'Passwort' },
  'auth.pleaseWait': { en: 'Please wait\u2026', de: 'Bitte warten\u2026' },
  'auth.noAccount': { en: 'No account yet? Sign up', de: 'Noch kein Konto? Jetzt registrieren' },
  'auth.haveAccount': { en: 'Already have an account? Sign in', de: 'Bereits ein Konto? Jetzt anmelden' },
  'auth.back': { en: '\u2190 Back', de: '\u2190 Zur\u00fcck' },
  'auth.signInFirst': { en: 'Please sign in first.', de: 'Bitte zuerst anmelden.' },
  'auth.signInToTrade': { en: 'Sign in to buy or bid.', de: 'Bitte anmelden, um zu kaufen oder zu bieten.' },
  'auth.signInToSell': { en: 'Sign in to publish your listing.', de: 'Bitte anmelden, um dein Inserat zu veröffentlichen.' },
  'auth.required': { en: 'Email and password required.', de: 'E-Mail und Passwort erforderlich.' },

  'order.pending_payment': { en: 'Payment pending', de: 'Zahlung ausstehend' },
  'order.paid_escrow': { en: 'Paid \u00b7 in escrow', de: 'Bezahlt \u00b7 in Treuhand' },
  'order.shipped': { en: 'Shipped', de: 'Versendet' },
  'order.delivered': { en: 'Delivered', de: 'Geliefert' },
  'order.released': { en: 'Completed', de: 'Abgeschlossen' },
  'order.disputed': { en: 'Disputed', de: 'Reklamiert' },
  'order.cancelled': { en: 'Cancelled', de: 'Storniert' },
  'order.refunded': { en: 'Refunded', de: 'R\u00fcckerstattet' },
  'order.role.buy': { en: 'Purchase', de: 'Kauf' },
  'order.role.sell': { en: 'Sale', de: 'Verkauf' },
  'order.action.payNow': { en: 'Pay now', de: 'Jetzt bezahlen' },
  'order.action.cancel': { en: 'Cancel', de: 'Stornieren' },
  'order.action.markShipped': { en: 'Mark as shipped', de: 'Als versendet markieren' },
  'order.action.confirmRelease': { en: 'Confirm receipt & release escrow', de: 'Erhalt best\u00e4tigen & Treuhand freigeben' },
  'order.action.dispute': { en: 'Open a dispute', de: 'Reklamation einreichen' },
  'order.trackingPrompt': { en: 'Tracking number (optional):', de: 'Sendungsnummer (optional):' },
  'order.confirmReleasePrompt': {
    en: 'Only confirm once the shirt has arrived and matches the listing. This releases the payment to the seller and cannot be undone.',
    de: 'Erst bestätigen, wenn das Trikot angekommen ist und der Beschreibung entspricht. Die Zahlung geht dann an den Verkäufer — das kann nicht rückgängig gemacht werden.'
  },

  'toast.signedOut': { en: 'Signed out', de: 'Abgemeldet' },
  'toast.signedIn': { en: 'Signed in', de: 'Angemeldet' },
  'toast.accountCreated': { en: 'Account created \u2014 confirm your email if required, then sign in.', de: 'Konto erstellt \u2014 bitte E-Mail best\u00e4tigen falls n\u00f6tig, dann anmelden.' },
  'toast.paymentsNotConfigured': { en: "Payments aren't configured yet.", de: 'Zahlungen sind noch nicht konfiguriert.' },
  'toast.paymentStartFailed': { en: 'Could not start payment \u2014 please try again.', de: 'Zahlung konnte nicht gestartet werden \u2014 bitte erneut versuchen.' },
  'toast.markedShipped': { en: 'Marked as shipped', de: 'Als versendet markiert' },
  'toast.releaseConfirmed': { en: 'Receipt confirmed \u00b7 escrow released', de: 'Erhalt best\u00e4tigt \u00b7 Treuhand freigegeben' },
  'toast.disputePrompt': { en: 'Reason for the dispute:', de: 'Grund f\u00fcr die Reklamation:' },
  'toast.disputeFiled': { en: 'Dispute filed', de: 'Reklamation eingereicht' },
  'toast.disputeFailed': { en: 'Dispute failed \u2014 please try again.', de: 'Reklamation fehlgeschlagen \u2014 bitte erneut versuchen.' },
  'toast.orderCancelled': { en: 'Order cancelled', de: 'Bestellung storniert' },
  'toast.cancelFailed': { en: 'Cancellation failed \u2014 please try again.', de: 'Stornieren fehlgeschlagen \u2014 bitte erneut versuchen.' },
  'toast.actionFailed': { en: 'Action failed \u2014 please try again.', de: 'Aktion fehlgeschlagen \u2014 bitte erneut versuchen.' }
};

export function translate(lang: string, key: string): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang as Lang] || entry.en || key;
}
