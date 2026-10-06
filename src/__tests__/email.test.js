import { describe, expect, it } from 'vitest';
import { deepLink, renderEmail } from '../../supabase/functions/send-notification/email.ts';

const base = { title: 'Your order shipped', body: 'ger-26 (M) is on its way.', type: 'order_shipped', appUrl: 'https://maillot.app/' };

describe('notification email', () => {
  it('links straight to the order, else the shirt, else the app', () => {
    expect(deepLink({ ...base, data: { order_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', shirt_id: 'ger-26' } }).href).toBe('https://maillot.app/orders/7c9e6679-7425-40de-944b-e07fc1f90ae7');
    expect(deepLink({ ...base, data: { shirt_id: 'ger-26' } })).toEqual({ href: 'https://maillot.app/shirt/ger-26', label: 'View shirt' });
    expect(deepLink({ ...base, data: null }).href).toBe('https://maillot.app/');
  });

  it('never puts unsafe ids or text into links or markup', () => {
    expect(deepLink({ ...base, data: { order_id: '"><script>' } }).href).toBe('https://maillot.app/');
    const { html } = renderEmail({ ...base, title: '<b>hi</b>', body: 'a & "b"', data: null });
    expect(html).toContain('&lt;b&gt;hi&lt;/b&gt;');
    expect(html).toContain('a &amp; &quot;b&quot;');
    expect(html).not.toContain('<b>hi');
  });

  it('has a branded HTML part and a plain-text part with the same content', () => {
    const { subject, html, text } = renderEmail({ ...base, data: { order_id: 'abc-123' } });
    expect(subject).toBe('Your order shipped');
    expect(html).toContain('https://maillot.app/icons/icon-192.png');
    expect(html).toContain('href="https://maillot.app/orders/abc-123"');
    expect(text).toContain('View order: https://maillot.app/orders/abc-123');
    expect(text.startsWith('Your order shipped\n\nger-26 (M) is on its way.')).toBe(true);
  });

  it('still sends a readable mail without APP_URL (no broken links)', () => {
    const { html, text } = renderEmail({ ...base, appUrl: '', data: { order_id: 'abc' } });
    expect(html).not.toContain('href=');
    expect(html).not.toContain('<img');
    expect(text).not.toContain('http');
  });
});
