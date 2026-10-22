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
  'Your shirt is on its way': ['notif.shipped.title', 'notif.shipped.body'],
  'Your sale was delivered': ['notif.delivered.title', 'notif.delivered.body'],
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
  'Your shirt went down': ['notif.moveDown.title', 'notif.moveDown.body'],
  'New follower': ['notif.follower.title', 'notif.follower.body'],
  'New listing from a collector you follow': ['notif.followedListing.title', 'notif.followedListing.body'],
  'New shirt in a collection you follow': ['notif.followedShirt.title', 'notif.followedShirt.body'],
  'Someone liked your shirt': ['notif.shirtLiked.title', 'notif.shirtLiked.body'],
  'New comment on your shirt': ['notif.shirtComment.title', null],
  'A shirt you want is listed': ['notif.listingAlert.title', 'notif.listingAlert.body'],
  'New offer for your shirt': ['notif.offer.title', 'notif.offer.body'],
  'Your offer was accepted': ['notif.offerAccepted.title', 'notif.offerAccepted.body'],
  'Your offer was declined': ['notif.offerDeclined.title', 'notif.offerDeclined.body'],
  'A shirt you want is in a collection': ['notif.wanted.title', 'notif.wanted.body'],
  'Someone is interested in your shirt': ['notif.inquiry.title', 'notif.inquiry.body'],
  'The owner replied to your inquiry': ['notif.inquiryReply.title', null],
  'Your shirt reached an all-time high': ['notif.ath.title', 'notif.ath.body'],
  'You received a counter-offer': ['notif.counter.title', 'notif.counter.body'],
  'Your counter-offer was accepted': ['notif.counterAccepted.title', 'notif.counterAccepted.body'],
  'Your counter-offer was declined': ['notif.counterDeclined.title', 'notif.counterDeclined.body'],
  'Your collection went up this week': ['notif.weekUp.title', 'notif.weekUp.body'],
  'Your collection went down this week': ['notif.weekDown.title', 'notif.weekDown.body'],
  'Your pack is ready': ['notif.fantasyPack.title', 'notif.fantasyPack.body'],
  'Deadline in 3 hours – set your captain': ['notif.fantasyDeadline.title', 'notif.fantasyDeadline.body'],
  'Matchday result': ['notif.fantasyResult.title', 'notif.fantasyResult.body'],
  'Manager of the Matchday': ['notif.fantasyMotm.title', 'notif.fantasyMotm.body'],
  'Head-to-head: won': ['notif.fantasyH2hWon.title', 'notif.fantasyH2h.body'],
  'Head-to-head: lost': ['notif.fantasyH2hLost.title', 'notif.fantasyH2h.body'],
  'Head-to-head: draw': ['notif.fantasyH2hDraw.title', 'notif.fantasyH2h.body'],
  'Cup ends this weekend': ['notif.fantasyCupEnd.title', 'notif.fantasyCupEnd.body'],
  'Promoted': ['notif.fantasyPromoted.title', 'notif.fantasyPromoted.body'],
  'You won a prize': ['notif.fantasyPrize.title', 'notif.fantasyPrize.body']
};

type N = { title: string; body: string | null; data: unknown };

export function localizeNotification(n: N, t: (key: MessageKey, vars?: Vars) => string, money: (chf: number) => string): { title: string; body: string | null } {
  // Album nudges carry the album's name in the title.
  const keys = BY_TITLE[n.title] ?? (n.title.startsWith('1 shirt missing for ') ? (['notif.fantasyAlbum.title', 'notif.fantasyAlbum.body'] as [MessageKey, MessageKey]) : undefined);
  if (!keys) return { title: n.title, body: n.body };
  const data = (n.data ?? {}) as { shirt_id?: string; catalog_id?: string; size?: string; amount?: number; delta?: number; tracking_code?: string; change_pct?: number; handle?: string | null; matchday?: number; points?: number; rank?: number; players?: number; a?: number; b?: number; league?: string; division?: number; album?: string; offers?: number; prize?: string; cup?: string };
  const body = n.body ?? '';
  const vars: Vars = {
    shirt: ((data.shirt_id ?? data.catalog_id) && BY[(data.shirt_id ?? data.catalog_id)!]?.name) || data.shirt_id || data.catalog_id || '',
    size: data.size ?? /\(([^)]+)\)/.exec(body)?.[1] ?? '',
    amount: data.amount != null ? money(Number(data.amount)) : (/CHF [\d'.,]+/.exec(body)?.[0] ?? ''),
    date: /\d{2}\.\d{2}\.(?: \d{2}:\d{2})?/.exec(body)?.[0] ?? '',
    pct: data.change_pct != null ? String(Math.abs(Number(data.change_pct))) : (/(\d+)%/.exec(body)?.[1] ?? ''),
    handle: data.handle ? '@' + data.handle : (/@\w+/.exec(body)?.[0] ?? ''),
    delta: data.delta != null ? money(Math.abs(Number(data.delta))) : '',
    n: data.matchday ?? '',
    points: data.points ?? '',
    rank: data.rank ?? '',
    players: data.players ?? '',
    a: data.a ?? '',
    b: data.b ?? '',
    league: data.league ?? '',
    division: data.division ?? '',
    album: data.album ?? '',
    offers: data.offers ?? '',
    prize: data.prize ?? '',
    cup: data.cup ?? ''
  };
  const [titleKey, bodyKey] = keys;
  return { title: t(titleKey), body: bodyKey ? t(bodyKey, vars) : n.body };
}
