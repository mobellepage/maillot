// The help/legal pages, in footer and side-nav order.
export type LegalDoc = 'imprint' | 'terms' | 'privacy' | 'help';

export const LEGAL_DOCS: { id: LegalDoc; label: string }[] = [
  { id: 'help', label: 'Help & contact' },
  { id: 'terms', label: 'Terms of use' },
  { id: 'privacy', label: 'Privacy policy' },
  { id: 'imprint', label: 'Imprint' }
];
