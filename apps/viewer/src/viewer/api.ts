import type { PublicEvent } from './model'

const tokenPattern = /^[A-Za-z0-9_-]{32,}$/

export function viewerTokenFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/events\/([^/]+)$/)
  const token = match?.[1]
  return token && tokenPattern.test(token) ? token : null
}

export async function fetchPublicEvent(token: string, signal?: AbortSignal): Promise<PublicEvent> {
  const response = await fetch(`/v1/public/events/${encodeURIComponent(token)}`, {
    cache: 'no-store',
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    // Invalid, expired, revoked, and unknown tokens all look identical.
    throw new Error('EVENT_UNAVAILABLE')
  }

  return (await response.json()) as PublicEvent
}
