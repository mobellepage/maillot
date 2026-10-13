// Legal entity details used by the footer, imprint, terms and privacy pages.
// Values in [brackets] are placeholders that MUST be replaced with the real
// registered details before launch — the pages show a visible "draft" notice
// until LEGAL_REVIEWED is set to true (after a lawyer has reviewed them).

// Prototype phase: there is no registered company yet, so nothing here may
// read like one. Replace every [placeholder] once the company is founded.
export const COMPANY = {
  name: 'Maillot – Prototyp',
  street: '[Street and number — follows once the company is registered]',
  city: '[Postcode and town]',
  country: 'Switzerland',
  uid: '[UID — follows once the company is registered]',
  register: '[Commercial register — follows once the company is registered]',
  representatives: '[Name(s) of the board / managing directors]',
  email: 'hello@maillot.app',
  supportEmail: 'support@maillot.app',
  privacyEmail: 'privacy@maillot.app'
} as const;

export const LEGAL_REVIEWED = false;
export const LEGAL_LAST_UPDATED = '4 October 2026';
