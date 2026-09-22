import { describe, expect, it } from 'vitest'
import { parsePublicEvent, viewerTokenFromPath } from './api'
import { eventStateCopy, freshnessCopy, locationMapURL } from './model'

describe('public viewer boundaries', () => {
  it('only accepts a high-entropy event token in the exact route shape', () => {
    expect(viewerTokenFromPath('/events/short')).toBeNull()
    expect(viewerTokenFromPath('/events/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ')).toBe('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ')
    expect(viewerTokenFromPath('/events/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ/extra')).toBeNull()
  })

  it('labels stale location honestly and generates a direct map link', () => {
    expect(freshnessCopy.stale).toMatch(/may no longer/i)
    expect(locationMapURL({ latitude: -33.8688, longitude: 151.2093, horizontalAccuracyM: 18, capturedAt: '2026-09-21T00:00:00Z', freshness: 'live' }))
      .toContain('openstreetmap.org')
  })

  it('uses complete, user-facing labels for every alert state', () => {
    expect(eventStateCopy.active).toBe('Alert active')
    expect(eventStateCopy.resolved).toBe('Alert resolved')
    expect(eventStateCopy.expired).toBe('Alert expired')
  })

  it('rebuilds the public projection and discards unapproved response fields', () => {
    const event = parsePublicEvent({
      kind: 'test',
      displayName: 'Sample user',
      state: 'active',
      triggeredAt: '2026-09-21T00:00:01Z',
      lastUpdatedAt: '2026-09-21T00:00:12Z',
      guidance: { summary: 'Contact Sample user now.' },
      internalEventID: 'must-not-reach-the-viewer',
    })

    expect(event).not.toHaveProperty('internalEventID')
    expect(event.location).toBeUndefined()
  })

  it('rejects malformed public-event payloads', () => {
    expect(() => parsePublicEvent({ kind: 'real' })).toThrow('INVALID_PUBLIC_EVENT')
  })
})
