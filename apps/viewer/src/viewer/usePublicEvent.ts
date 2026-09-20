import { useEffect, useState } from 'react'
import { fetchPublicEvent } from './api'
import type { PublicEvent } from './model'
import { nextPollDelay } from './polling'

export type PublicEventLoadState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error'; event?: PublicEvent }
  | { status: 'loaded'; event: PublicEvent }

export function usePublicEvent(token: string | null): PublicEventLoadState {
  const [state, setState] = useState<PublicEventLoadState>({ status: 'loading' })

  useEffect(() => {
    if (!token) {
      setState({ status: 'unavailable' })
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let failureCount = 0
    let latestEvent: PublicEvent | undefined

    const schedule = (delay: number) => {
      if (!cancelled && document.visibilityState === 'visible') {
        timer = setTimeout(load, delay)
      }
    }

    const load = async () => {
      const controller = new AbortController()
      try {
        const event = await fetchPublicEvent(token, controller.signal)
        if (cancelled) return
        latestEvent = event
        failureCount = 0
        setState({ status: 'loaded', event })
        schedule(nextPollDelay(failureCount))
      } catch (error) {
        if (cancelled) return
        if (error instanceof Error && error.message === 'EVENT_UNAVAILABLE') {
          setState({ status: 'unavailable' })
          return
        }
        failureCount += 1
        setState({ status: 'error', event: latestEvent })
        schedule(nextPollDelay(failureCount))
      }
    }

    const onVisibilityChange = () => {
      if (timer) clearTimeout(timer)
      if (document.visibilityState === 'visible') void load()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    void load()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [token])

  return state
}
