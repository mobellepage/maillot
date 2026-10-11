// Theme preview switch: ?theme=light shows the light "KitVault v3" design
// and remembers it in this browser; ?theme=dark goes back to the default.
// Nothing changes for anyone who doesn't ask for it.
const KEY = 'kv_theme';

export function applyThemeFromUrl(): void {
  if (typeof window === 'undefined') return;
  let theme: string | null = null;
  try {
    const asked = new URLSearchParams(window.location.search).get('theme');
    if (asked === 'light' || asked === 'dark') localStorage.setItem(KEY, asked);
    theme = localStorage.getItem(KEY);
  } catch {
    theme = null;
  }
  if (theme === 'light') document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
}
