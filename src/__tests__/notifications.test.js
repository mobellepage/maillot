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
  it('shows free text and unknown titles as sent', () => {
    expect(localizeNotification({ title: 'Dispute opened against your order', body: 'Never arrived', data: {} }, t, money)).toEqual({ title: 'Reklamation zu deiner Bestellung eröffnet', body: 'Never arrived' });
    expect(localizeNotification({ title: 'Something new', body: 'x', data: {} }, t, money)).toEqual({ title: 'Something new', body: 'x' });
  });
});
