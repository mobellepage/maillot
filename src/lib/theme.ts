// Theme switch: the light "KitVault v3" design is the default; ?theme=dark
// shows the dark look and remembers it in this browser, ?theme=light goes
// back.
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
  if (theme === 'dark') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = 'light';
}
