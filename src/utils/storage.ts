// Tiny localStorage helpers for per-device preferences (currency, language)
// and in-progress "Trikot hinzufügen" drafts. Account data lives in Supabase.

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // storage unavailable or quota exceeded — preferences just won't persist
  }
}
