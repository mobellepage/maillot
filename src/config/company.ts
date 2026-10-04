// Legal entity details used by the footer, imprint, terms and privacy pages.
// Values in [brackets] are placeholders that MUST be replaced with the real
// registered details before launch — the pages show a visible "draft" notice
// until LEGAL_REVIEWED is set to true (after a lawyer has reviewed them).

export const COMPANY = {
  name: 'Maillot AG',
  street: '[Street and number]',
  city: '[Postcode] Zürich',
  country: 'Switzerland',
  uid: 'CHE-[xxx.xxx.xxx]',
  register: 'Commercial register of the Canton of Zürich',
  representatives: '[Name(s) of the board / managing directors]',
  email: 'hello@maillot.app',
  supportEmail: 'support@maillot.app',
  privacyEmail: 'privacy@maillot.app'
} as const;

export const LEGAL_REVIEWED = false;
export const LEGAL_LAST_UPDATED = '4 October 2026';
