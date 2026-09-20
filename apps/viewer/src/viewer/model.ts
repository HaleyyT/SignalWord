export type AlertKind = 'test' | 'real'
export type EventState = 'active' | 'resolved' | 'expired'
export type Freshness = 'live' | 'recent' | 'stale' | 'unavailable'

export interface PublicLocation {
  latitude: number
  longitude: number
  horizontalAccuracyM: number
  capturedAt: string
  freshness: Freshness
}

export interface PublicEvent {
  kind: AlertKind
  displayName: string
  state: EventState
  triggeredAt: string
  lastUpdatedAt: string
  location?: PublicLocation
  guidance: { summary: string }
}

export const freshnessCopy: Record<Freshness, string> = {
  live: 'Location updated within the last 30 seconds',
  recent: 'Location updated recently',
  stale: 'Location may no longer reflect the current position',
  unavailable: 'Location is unavailable',
}

export function locationMapURL(location: PublicLocation): string {
  const latitude = location.latitude.toFixed(6)
  const longitude = location.longitude.toFixed(6)
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`
}
