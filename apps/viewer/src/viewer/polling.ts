export const POLL_INTERVAL_MS = 10_000
export const MAX_BACKOFF_MS = 60_000

/** Bounded exponential backoff for transient viewer failures. */
export function nextPollDelay(failureCount: number): number {
  if (failureCount <= 0) return POLL_INTERVAL_MS
  return Math.min(POLL_INTERVAL_MS * 2 ** failureCount, MAX_BACKOFF_MS)
}
