// In the app — the iOS app and Maillot installed on the home screen — the
// screen keeps its scale: no pinch or double-tap zoom and no zoom into a
// field on focus. In a normal browser tab people can still zoom (WCAG 1.4.4:
// some need it to read). iOS ignores user-scalable=no for pinching, so its
// gesture events are stopped too.
import { isNative } from './native.ts';

const inApp = () => isNative() || (typeof matchMedia !== 'undefined' && (matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true));

export function lockZoom(): void {
  if (typeof document === 'undefined' || !inApp()) return;
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
  document.documentElement.classList.add('no-zoom');
  const stop = (e: Event) => e.preventDefault();
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, stop, { passive: false });
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );
}
