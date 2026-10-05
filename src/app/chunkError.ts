/** A lazily loaded page's code is missing (usually: we deployed while the tab was open). */
export function isChunkError(e: unknown): boolean {
  const msg = String((e as Error)?.message ?? e);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(msg);
}
