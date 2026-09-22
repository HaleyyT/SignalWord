import type { PublicEvent } from './model'

const tokenPattern = /^[A-Za-z0-9_-]{43,128}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isText(value: unknown, maximumLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximumLength
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Validates and rebuilds the only data shape a contact viewer is permitted to render.
 * Rebuilding, rather than casting JSON, prevents accidental future API fields from
 * becoming available to the public UI.
 */
export function parsePublicEvent(value: unknown): PublicEvent {
  if (!isRecord(value)) throw new Error('INVALID_PUBLIC_EVENT')

  const { kind, displayName, state, triggeredAt, lastUpdatedAt, location, guidance } = value
  if ((kind !== 'test' && kind !== 'real') ||
    !isText(displayName, 80) ||
    (state !== 'active' && state !== 'resolved' && state !== 'expired') ||
    !isTimestamp(triggeredAt) ||
    !isTimestamp(lastUpdatedAt) ||
    !isRecord(guidance) ||
    !isText(guidance.summary, 500)) {
    throw new Error('INVALID_PUBLIC_EVENT')
  }

  let safeLocation: PublicEvent['location']
  if (location !== undefined) {
    if (!isRecord(location) ||
      !isFiniteNumber(location.latitude) || location.latitude < -90 || location.latitude > 90 ||
      !isFiniteNumber(location.longitude) || location.longitude < -180 || location.longitude > 180 ||
      !isFiniteNumber(location.horizontalAccuracyM) || location.horizontalAccuracyM < 0 || location.horizontalAccuracyM > 100_000 ||
      !isTimestamp(location.capturedAt) ||
      (location.freshness !== 'live' && location.freshness !== 'recent' && location.freshness !== 'stale' && location.freshness !== 'unavailable')) {
      throw new Error('INVALID_PUBLIC_EVENT')
    }
    safeLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      horizontalAccuracyM: location.horizontalAccuracyM,
      capturedAt: location.capturedAt,
      freshness: location.freshness,
    }
  }

  return {
    kind,
    displayName,
    state,
    triggeredAt,
    lastUpdatedAt,
    ...(safeLocation ? { location: safeLocation } : {}),
    guidance: { summary: guidance.summary },
  }
}

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

  return parsePublicEvent(await response.json())
}
