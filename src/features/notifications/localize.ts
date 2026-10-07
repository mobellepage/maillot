// Notifications are written by database triggers in English. We know every
// title the server can send, so they're shown in the reader's language,
// filling the shirt name, size, amount and dates from the notification's
// data (falling back to what the English text contains). Unknown titles —
// or free text such as a dispute reason — are shown as sent.
import { BY } from '../../data.ts';
import type { MessageKey, Vars } from '../../i18n/index.ts';

const BY_TITLE: Record<string, [MessageKey, MessageKey | null]> = {
  'Payment received': ['notif.paidSeller.title', 'notif.paidSeller.body'],
  'Payment held in escrow': ['notif.paidBuyer.title', 'notif.paidBuyer.body'],
  'On its way to authentication': ['notif.shipped.title', 'notif.shipped.body'],
  'Escrow released': ['notif.released.title', 'notif.released.body'],
  'Order cancelled': ['notif.cancelled.title', 'notif.cancelled.body'],
  'Order refunded': ['notif.refunded.title', 'notif.refunded.body'],
  'Authenticated — on its way to you': ['notif.authBuyer.title', 'notif.authBuyer.body'],
  'Your sale passed authentication': ['notif.authSeller.title', 'notif.authSeller.body'],
  'Your sale didn’t pass authentication': ['notif.authFailed.title', 'notif.authFailed.body'],
  'Complete your payment': ['notif.payReminder.title', 'notif.payReminder.body'],
  'Order expired': ['notif.expired.title', 'notif.expired.body'],
  'Ship your sale': ['notif.shipReminder.title', 'notif.shipReminder.body'],
  'Order cancelled — not shipped': ['notif.unshipped.title', 'notif.unshipped.body'],
  'Did your shirt arrive?': ['notif.releaseReminder.title', 'notif.releaseReminder.body'],
  'Dispute opened against your order': ['notif.dispute.title', null],
  'Your bid was matched': ['notif.bidMatched.title', 'notif.bidMatched.body'],
  'Your item sold': ['notif.askMatched.title', 'notif.askMatched.body'],
  'New review': ['notif.review.title', null],
  'Your shirt went up': ['notif.moveUp.title', 'notif.moveUp.body'],
  'Your shirt went down': ['notif.moveDown.title', 'notif.moveDown.body']
};

type N = { title: string; body: string | null; data: unknown };

export function localizeNotification(n: N, t: (key: MessageKey, vars?: Vars) => string, money: (chf: number) => string): { title: string; body: string | null } {
  const keys = BY_TITLE[n.title];
  if (!keys) return { title: n.title, body: n.body };
  const data = (n.data ?? {}) as { shirt_id?: string; size?: string; amount?: number; tracking_code?: string; change_pct?: number };
  const body = n.body ?? '';
  const vars: Vars = {
    shirt: (data.shirt_id && BY[data.shirt_id]?.name) || data.shirt_id || '',
    size: data.size ?? /\(([^)]+)\)/.exec(body)?.[1] ?? '',
    amount: data.amount != null ? money(Number(data.amount)) : (/CHF [\d'.,]+/.exec(body)?.[0] ?? ''),
    date: /\d{2}\.\d{2}\.(?: \d{2}:\d{2})?/.exec(body)?.[0] ?? '',
    pct: data.change_pct != null ? String(Math.abs(Number(data.change_pct))) : (/(\d+)%/.exec(body)?.[1] ?? '')
  };
  const [titleKey, bodyKey] = keys;
  return { title: t(titleKey), body: bodyKey ? t(bodyKey, vars) : n.body };
}
