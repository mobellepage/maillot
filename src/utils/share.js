// Real, self-contained share-link encoding: the entire payload is embedded in the
// URL hash (base64 of UTF-8 JSON) rather than referencing a server-side record —
// since this app has no backend, a link is only genuinely shareable (works for any
// recipient, in any browser, with no localStorage/session) if it carries its own data.

export function encodeShareData(data) {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeShareData(encoded) {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

// Returns `undefined` when the URL carries no vault link at all (normal app load),
// or the decoded payload (or `null` for a present-but-corrupt link) otherwise — callers
// use this distinction to tell "not a share link" apart from "broken share link".
export function parseShareHash(hash) {
  const m = (hash || '').match(/^#\/vault\/(.+)$/);
  if (!m) return undefined;
  return decodeShareData(decodeURIComponent(m[1]));
}
