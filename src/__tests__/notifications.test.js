import { describe, expect, it } from 'vitest';
import { localizeNotification } from '../features/notifications/localize.ts';
import { de } from '../i18n/de.ts';
import { format } from '../i18n/index.ts';

const t = (k, v) => format(de, k, v);
const money = (n) => 'CHF ' + n;

describe('localizeNotification', () => {
  it('translates known server titles and fills shirt, size and date', () => {
    const n = { title: 'Ship your sale', body: 'Please ship sui-26 (L) by 10.10. — otherwise the buyer is refunded automatically.', data: { order_id: 'x', shirt_id: 'sui-26' } };
    expect(localizeNotification(n, t, money)).toEqual({
      title: 'Versende deinen Verkauf',
      body: 'Bitte versende Switzerland 2026 Home (L) bis 10.10. — sonst wird der Käufer automatisch rückerstattet.'
    });
  });
  it('uses data for amounts', () => {
    const n = { title: 'Your bid was matched', body: 'Your bid on ger-26 (M) matched at CHF 139 — …', data: { shirt_id: 'ger-26', size: 'M', amount: 139 } };
    expect(localizeNotification(n, t, money).body).toContain('CHF 139');
  });
  it('names the collector in follow notifications', () => {
    expect(localizeNotification({ title: 'New follower', body: '@fan_one now follows your collection', data: { handle: 'fan_one' } }, t, money)).toEqual({ title: 'Neuer Follower', body: '@fan_one folgt jetzt deiner Sammlung.' });
    const listing = { title: 'New listing from a collector you follow', body: '…', data: { handle: 'star', shirt_id: 'sui-26', size: 'L', amount: 180 } };
    expect(localizeNotification(listing, t, money).body).toBe('@star bietet Switzerland 2026 Home (L) für CHF 180 an.');
  });
  it('celebrates an all-time high', () => {
    const n = { title: 'Your shirt reached an all-time high', body: '…', data: { shirt_id: 'ned-88', amount: 331 } };
    expect(localizeNotification(n, t, money)).toEqual({ title: 'Allzeithoch für dein Trikot', body: 'Netherlands 1988 Home ist jetzt etwa CHF 331 wert – so viel wie noch nie.' });
  });
  it('sums up the collection week', () => {
    const up = { title: 'Your collection went up this week', body: '…', data: { change_pct: 7.9, delta: 15, amount: 205 } };
    expect(localizeNotification(up, t, money)).toEqual({ title: 'Deine Sammlung ist diese Woche gestiegen', body: 'Plus 7.9 % (+CHF 15) – jetzt etwa CHF 205 wert.' });
    const down = { title: 'Your collection went down this week', body: '…', data: { change_pct: -2.5, delta: -40, amount: 1560 } };
    expect(localizeNotification(down, t, money).body).toBe('Minus 2.5 % (−CHF 40) – jetzt etwa CHF 1560 wert.');
  });
  it('announces a listing that matches an alert', () => {
    const n = { title: 'A shirt you want is listed', body: '…', data: { shirt_id: 'ned-88', size: 'M', amount: 280 } };
    expect(localizeNotification(n, t, money)).toEqual({ title: 'Ein gesuchtes Trikot ist im Angebot', body: 'Netherlands 1988 Home (M) ist jetzt für CHF 280 im Angebot.' });
  });
  it('tells members about offers and wanted shirts in collections', () => {
    const offer = { title: 'New offer for your shirt', body: '…', data: { offer_id: 'o', catalog_id: 'ajx-95', size: 'M', amount: 175, handle: 'fan' } };
    expect(localizeNotification(offer, t, money).body).toBe('@fan bietet CHF 175 für Ajax 1994/95 Home (M).');
    const wanted = { title: 'A shirt you want is in a collection', body: '…', data: { handle: 'owner', catalog_id: 'ajx-95', size: 'M' } };
    expect(localizeNotification(wanted, t, money)).toEqual({ title: 'Ein Wunschtrikot ist in einer Sammlung', body: '@owner hat Ajax 1994/95 Home (M) und ist offen für Angebote.' });
  });
  it('shows free text and unknown titles as sent', () => {
    expect(localizeNotification({ title: 'Dispute opened against your order', body: 'Never arrived', data: {} }, t, money)).toEqual({ title: 'Reklamation zu deiner Bestellung eröffnet', body: 'Never arrived' });
    expect(localizeNotification({ title: 'Something new', body: 'x', data: {} }, t, money)).toEqual({ title: 'Something new', body: 'x' });
  });
});
