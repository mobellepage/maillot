// Route-level error boundary. Two cases worth telling apart:
//  - a lazily loaded page's code is gone (we deployed while the tab was
//    open): reload once to pick up the new build;
//  - anything else crashed while rendering: say so, offer a way out.
import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { isChunkError } from './chunkError.ts';

const RELOADED = 'maillot:chunk-reload';

export default function RouteError() {
  const error = useRouteError();
  const chunk = isChunkError(error);

  useEffect(() => {
    if (!chunk) return;
    try {
      if (sessionStorage.getItem(RELOADED)) return; // already tried once; show the message instead
      sessionStorage.setItem(RELOADED, '1');
    } catch {
      return;
    }
    window.location.reload();
  }, [chunk]);

  useEffect(() => {
    if (!chunk) console.error('[route error]', error);
  }, [chunk, error]);

  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main id="main" role="alert" style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(56px,10vw,120px) var(--gutter)', textAlign: 'center' }}>
      <div className="eyebrow">{notFound ? '404' : 'Something went wrong'}</div>
      <h1 className="display" style={{ marginTop: 10, fontSize: 'clamp(28px,4vw,40px)' }}>
        {chunk ? 'Maillot was just updated' : notFound ? 'Page not found' : 'This page crashed'}
      </h1>
      <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.6, margin: '14px 0 0' }}>
        {chunk ? 'Reload to get the latest version.' : notFound ? 'The link may be old or mistyped.' : 'We’ve been told about it. Reloading usually helps; your orders and collection are safe.'}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => {
            try {
              sessionStorage.removeItem(RELOADED);
            } catch {
              /* storage blocked: reload anyway */
            }
            window.location.reload();
          }}
        >
          Reload
        </button>
        <Link to="/" className="btn btn--ghost btn--sm" reloadDocument>
          Home
        </Link>
      </div>
    </main>
  );
}
