export const FOCUS_STALE_MS = 30_000;

export function isStale(lastLoadedAt: number | null, now: number, maxAgeMs: number = FOCUS_STALE_MS): boolean {
  return lastLoadedAt === null || now - lastLoadedAt >= maxAgeMs;
}
