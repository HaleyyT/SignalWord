import { useState } from 'react'
import { confirmationTokenFromPath, confirmTrustedContact, withdrawTrustedContact } from './confirmation'

type State = 'ready' | 'submitting' | 'confirmed' | 'unavailable' | 'temporary' | 'withdrawn'

export function ContactConfirmationPage() {
  const token = confirmationTokenFromPath(window.location.pathname)
  const [state, setState] = useState<State>(token ? 'ready' : 'unavailable')

  async function confirm() {
    if (!token || state === 'submitting') return
    setState('submitting')
    setState(await confirmTrustedContact(token))
  }

  async function withdraw() {
    if (!token || state === 'submitting') return
    setState('submitting')
    setState(await withdrawTrustedContact(token))
  }

  return (
    <main className="viewer-shell">
      <section className="card viewer-status-card" aria-live="polite">
        <p className="eyebrow">Trusted contact</p>
        {state === 'withdrawn' ? (
          <><h1>Consent withdrawn</h1><p>Future and unclaimed messages are stopped. Messages already submitted to the email provider cannot be retracted.</p></>
        ) : state === 'confirmed' ? (
          <><h1>You’re confirmed</h1><p>You can now receive this person’s SignalWord TEST and REAL alert emails.</p></>
        ) : state === 'unavailable' ? (
          <><h1>This link is unavailable</h1><p>It may have expired, already been used, or been replaced. Ask the person to send a new confirmation.</p></>
        ) : state === 'temporary' ? (
          <><h1>Couldn’t confirm yet</h1><p>No confirmation was recorded. Check your connection and try again.</p><button className="primary-button" onClick={confirm}>Try again</button></>
        ) : (
          <>
            <h1>Accept trusted-contact role?</h1>
            <p>Confirm only if you recognise the person who added you and agree to receive their safety alerts.</p>
            <p>SignalWord does not contact emergency services or guarantee delivery or rescue.</p>
            <button className="primary-button" onClick={confirm} disabled={state === 'submitting'}>
              {state === 'submitting' ? 'Confirming…' : 'Confirm trusted-contact role'}
            </button>
          </>
        )}
        {token && state !== 'withdrawn' && (
          <><p>You can withdraw consent here after confirming. This stops future and unclaimed sends. A message already submitted to the email provider cannot be retracted.</p>
            <button onClick={withdraw} disabled={state === 'submitting'}>Withdraw trusted-contact consent</button></>
        )}
      </section>
    </main>
  )
}
