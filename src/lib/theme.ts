// Light or dark look. Light is the default; members and visitors can pick
// dark, or follow the device ("system"). The choice is kept in this browser
// (kv_theme); index.html applies it before the first paint, ?theme=dark or
// ?theme=light in a link sets it too.
import { useSyncExternalStore } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'kv_theme';
const listeners = new Set<() => void>();
let current: ThemePref = 'light';

const prefersDark = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

function apply(): void {
  const dark = current === 'dark' || (current === 'system' && prefersDark());
  if (dark) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0c0b' : '#ffffff');
}

export function applyThemeFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const asked = new URLSearchParams(window.location.search).get('theme');
    if (asked === 'light' || asked === 'dark' || asked === 'system') localStorage.setItem(KEY, asked);
    const saved = localStorage.getItem(KEY);
    current = saved === 'dark' || saved === 'system' ? saved : 'light';
  } catch {
    current = 'light';
  }
  apply();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => current === 'system' && apply());
}

export function setThemePref(pref: ThemePref): void {
  current = pref;
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // private mode: only for this visit
  }
  apply();
  listeners.forEach((l) => l());
}

/** Whether the dark look is showing right now. */
export const isDark = () => current === 'dark' || (current === 'system' && prefersDark());

export function useThemePref(): ThemePref {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => 'light' as ThemePref
  );
}
