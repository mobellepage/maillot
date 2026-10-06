// Cloudflare Turnstile bot check for sign-in and sign-up. Only active when
// VITE_TURNSTILE_SITE_KEY is set (and Turnstile is enabled in Supabase Auth,
// which then requires the token). Usually invisible to people.
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

export const CAPTCHA_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

let script: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  script ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return script;
}

export type CaptchaHandle = { reset: () => void };

export function Captcha({ onToken, lang, ref }: { onToken: (token: string | null) => void; lang: string; ref?: Ref<CaptchaHandle> }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const latest = useRef(onToken);
  useEffect(() => {
    latest.current = onToken;
  });
  useImperativeHandle(ref, () => ({ reset: () => widget.current && window.turnstile?.reset(widget.current) }), []);

  useEffect(() => {
    if (!CAPTCHA_SITE_KEY) return;
    let live = true;
    loadTurnstile()
      .then(() => {
        if (!live || !box.current || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: CAPTCHA_SITE_KEY,
          theme: 'dark',
          language: lang,
          callback: (t: string) => latest.current(t),
          'expired-callback': () => latest.current(null),
          'error-callback': () => latest.current(null)
        });
      })
      .catch(() => latest.current(null));
    return () => {
      live = false;
      if (widget.current) window.turnstile?.remove(widget.current);
    };
  }, [lang]);

  if (!CAPTCHA_SITE_KEY) return null;
  return <div ref={box} style={{ minHeight: 65 }} />;
}
