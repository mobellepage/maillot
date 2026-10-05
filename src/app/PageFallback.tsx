import { Page, Skeleton } from '../ui/index.ts';

/** Shown while a lazily-loaded page's code arrives. */
export function PageFallback() {
  return (
    <Page aria-busy="true" aria-label="Loading">
      <Skeleton width={120} height={12} />
      <Skeleton width="min(520px, 80%)" height={48} style={{ marginTop: 14 }} />
      <div className="grid-cards" style={{ marginTop: 32 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} height={240} radius={20} />
        ))}
      </div>
    </Page>
  );
}
