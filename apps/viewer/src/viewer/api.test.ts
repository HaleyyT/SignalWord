import { describe, expect, it } from 'vitest'
import { viewerTokenFromPath } from './api'
import { freshnessCopy, locationMapURL } from './model'

describe('public viewer boundaries', () => {
  it('only accepts a high-entropy event token in the exact route shape', () => {
    expect(viewerTokenFromPath('/events/short')).toBeNull()
    expect(viewerTokenFromPath('/events/abcdefghijklmnopqrstuvwxyzABCDEF12')).toBe('abcdefghijklmnopqrstuvwxyzABCDEF12')
    expect(viewerTokenFromPath('/events/abcdefghijklmnopqrstuvwxyzABCDEF12/extra')).toBeNull()
  })

  it('labels stale location honestly and generates a direct map link', () => {
    expect(freshnessCopy.stale).toMatch(/may no longer/i)
    expect(locationMapURL({ latitude: -33.8688, longitude: 151.2093, horizontalAccuracyM: 18, capturedAt: '2026-09-21T00:00:00Z', freshness: 'live' }))
      .toContain('openstreetmap.org')
  })
})
