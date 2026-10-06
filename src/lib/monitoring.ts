// Browser error reporting to our own database (report_client_error), so
// admins see what breaks for real visitors — no third-party tracker. At most
// 10 reports per page load, each distinct message once; noise from browser
// extensions and offline blips is dropped.
import { sb } from '../utils/supabase.ts';

declare const __RELEASE__: string;
const RELEASE = typeof __RELEASE__ === 'string' ? __RELEASE__ : 'dev';

const sent = new Set<string>();
let budget = 10;

const IGNORE = [/ResizeObserver loop/i, /Failed to fetch/i, /NetworkError/i, /Load failed/i, /AbortError/i, /chrome-extension:|moz-extension:|safari-extension:/i];

function describe(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.name + ': ' + err.message, stack: err.stack };
  if (err && typeof err === 'object' && 'message' in err) return { message: String((err as { message: unknown }).message), stack: 'code' in err ? 'code ' + String((err as { code: unknown }).code) : undefined };
  return { message: String(err) };
}

export function reportError(err: unknown, where?: string): void {
  if (typeof window === 'undefined' || import.meta.env.MODE === 'test') return;
  const { message, stack } = describe(err);
  const full = where ? `[${where}] ${message}` : message;
  if (IGNORE.some((re) => re.test(full) || re.test(stack ?? ''))) return;
  if (!navigator.onLine || budget <= 0 || sent.has(full)) return;
  sent.add(full);
  budget--;
  sb()
    .then((client) => client.rpc('report_client_error', { p_message: full, p_stack: stack?.slice(0, 4000), p_url: location.pathname, p_release: RELEASE, p_user_agent: navigator.userAgent }))
    .catch(() => {}); // reporting must never cause errors of its own
}

/** Uncaught errors and unhandled promise rejections, anywhere in the app. */
export function installErrorReporting(): void {
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'));
}
