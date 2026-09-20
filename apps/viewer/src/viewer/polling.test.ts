import { describe, expect, it } from 'vitest'
import { MAX_BACKOFF_MS, POLL_INTERVAL_MS, nextPollDelay } from './polling'

describe('viewer polling', () => {
  it('polls a visible healthy viewer every ten seconds', () => {
    expect(nextPollDelay(0)).toBe(POLL_INTERVAL_MS)
  })

  it('backs off transient errors without an unbounded wait', () => {
    expect(nextPollDelay(1)).toBe(20_000)
    expect(nextPollDelay(10)).toBe(MAX_BACKOFF_MS)
  })
})
