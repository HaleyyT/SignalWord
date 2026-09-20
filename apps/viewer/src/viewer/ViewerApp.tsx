import { useEffect, useState } from 'react'
import { fetchPublicEvent, viewerTokenFromPath } from './api'
import { freshnessCopy, locationMapURL, type PublicEvent } from './model'

type LoadState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'loaded'; event: PublicEvent }

function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
}

export function ViewerApp() {
  const token = viewerTokenFromPath(window.location.pathname)
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    if (!token) {
      setState({ status: 'unavailable' })
      return
    }

    let cancelled = false
    const controller = new AbortController()

    void fetchPublicEvent(token, controller.signal)
      .then((event) => !cancelled && setState({ status: 'loaded', event }))
      .catch(() => !cancelled && setState({ status: 'unavailable' }))

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [token])

  if (state.status === 'loading') {
    return <main className="viewer-shell"><p aria-live="polite">Loading alert…</p></main>
  }

  if (state.status === 'unavailable') {
    return (
      <main className="viewer-shell">
        <section className="card">
          <p className="eyebrow">SignalWord</p>
          <h1>This alert link is unavailable</h1>
          <p>It may have expired, been resolved and removed, or no longer be valid.</p>
        </section>
      </main>
    )
  }

  const { event } = state
  const location = event.location

  return (
    <main className="viewer-shell">
      <section className="card" aria-labelledby="alert-title">
        <p className="eyebrow">{event.kind === 'test' ? 'TEST — no emergency reported' : 'SIGNALWORD ALERT'}</p>
        <h1 id="alert-title">{event.displayName} {event.state === 'resolved' ? 'marked themselves safe' : 'sent an alert'}</h1>
        <p className="timestamp">Sent {formatTime(event.triggeredAt)}</p>
        <p className={`state state-${event.state}`}>{event.state === 'active' ? 'Alert active' : event.state}</p>
      </section>

      <section className="card" aria-labelledby="location-title">
        <h2 id="location-title">Latest available location</h2>
        {location ? (
          <>
            <p className={`freshness freshness-${location.freshness}`}>{freshnessCopy[location.freshness]}</p>
            <p>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · accuracy within {Math.round(location.horizontalAccuracyM)} m</p>
            <p className="timestamp">Captured {formatTime(location.capturedAt)}</p>
            <a href={locationMapURL(location)} rel="noreferrer" target="_blank">Open in a map</a>
          </>
        ) : (
          <p>Location is unavailable. The alert was still sent.</p>
        )}
      </section>

      <section className="card guidance" aria-labelledby="guidance-title">
        <h2 id="guidance-title">What to do</h2>
        <p>{event.guidance.summary}</p>
      </section>
    </main>
  )
}
