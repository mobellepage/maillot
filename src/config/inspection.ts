// The inspection checklist, versioned: a certificate stores the version it
// was inspected against ({"checklist":"v1"}), so later edits to the list
// never change what an old certificate claims. Entries are message keys
// (chk.v1.0 … chk.v1.13); the English text lives in src/i18n/en.ts.
export const INSPECTION_CHECKLIST = {
  v1: Array.from({ length: 14 }, (_, i) => `chk.v1.${i}`)
} as const;

export type ChecklistVersion = keyof typeof INSPECTION_CHECKLIST;
