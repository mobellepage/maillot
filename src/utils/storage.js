// Tiny localStorage helpers used to persist custom Vault items and in-progress
// "Trikot hinzufügen" drafts across reloads.

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // storage unavailable or quota exceeded — safe to ignore for this demo app
  }
}
