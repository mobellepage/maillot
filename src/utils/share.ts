// Self-contained share links: the whole public-safe payload is embedded in the
// URL hash (base64 of UTF-8 JSON), so a link works for any recipient with no
// account, session or server lookup.

export function encodeShareData(data: unknown): string {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeShareData<T = unknown>(encoded: string): T | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// Returns `undefined` when the URL carries no vault link at all (normal app load),
// or the decoded payload (or `null` for a present-but-corrupt link) otherwise — callers
// use this distinction to tell "not a share link" apart from "broken share link".
export function parseShareHash<T = unknown>(hash: string | null | undefined): T | null | undefined {
  const m = (hash || '').match(/^#\/vault\/(.+)$/);
  if (!m || !m[1]) return undefined;
  try {
    return decodeShareData<T>(decodeURIComponent(m[1]));
  } catch {
    return null; // malformed %-escapes: a broken link, not an app crash
  }
}
