// Screen readers hear nothing when a single-page app swaps the page. After
// each in-app navigation this announces the new page title and moves focus to
// the page's <main>, as a full page load would. Filter and search changes
// (same path) are left alone so they don't steal focus from the controls.
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { focusMain } from './focusMain.ts';

export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const [message, setMessage] = useState('');
  // Compare paths rather than counting runs: effects can run twice for one render.
  const shown = useRef(pathname);

  useEffect(() => {
    if (shown.current === pathname) return;
    shown.current = pathname;
    // Lazy pages render (and set their title) a moment after the URL changes.
    const timer = window.setTimeout(() => {
      setMessage(document.title);
      const active = document.activeElement;
      // Keep focus the new page placed itself (an autofocused field, a dialog).
      if (active && active !== document.body && (document.getElementById('main')?.contains(active) || active.closest('[role="dialog"]'))) return;
      focusMain();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
