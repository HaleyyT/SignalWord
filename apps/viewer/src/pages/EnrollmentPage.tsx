import { useEffect, useRef, useState } from 'react'
import './enrollment.css'

type Session = { attemptId: string; withdrawalToken: string; expiresAt: string }
type View = 'loading' | 'ready' | 'code' | 'pending_approval' | 'approved' | 'withdrawal_pending' | 'withdrawn' | 'expired' | 'unavailable'
type Widget = { render: (node: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id: string) => void }
declare global { interface Window { turnstile?: Widget } }
const invitePattern = /^[A-Za-z0-9_-]{43}$/
const managementPattern = /^[a-f0-9]{64}$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function enrollmentPath(path: string) {
  const join = /^\/join\/([A-Za-z0-9_-]{43})$/.exec(path)
  const manage = /^\/manage-contact\/([a-f0-9]{64})$/.exec(path)
  return join ? { token: join[1], management: false } : manage ? { token: manage[1], management: true } : null
}
export function parseEnrollmentSession(value: unknown): Session | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  return typeof row.attemptId === 'string' && uuidPattern.test(row.attemptId) && typeof row.withdrawalToken === 'string'
    && managementPattern.test(row.withdrawalToken) && typeof row.expiresAt === 'string' && Number.isFinite(Date.parse(row.expiresAt))
    ? { attemptId: row.attemptId, withdrawalToken: row.withdrawalToken, expiresAt: row.expiresAt } : null
}
async function call(token: string, action?: string, body?: unknown) {
  const response = await fetch(`/api/enrollment/${encodeURIComponent(token)}`, { method: action ? 'POST' : 'GET',
    credentials: 'same-origin', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(10000),
    headers: action ? { 'Content-Type': 'application/json', 'X-SignalWord-Action': action } : {},
    ...(action ? { body: JSON.stringify(body) } : {}) })
  if (!response.ok) throw new Error(response.status === 429 ? 'Please wait before requesting another code.'
    : response.status === 410 ? 'This link or request is no longer available.'
      : 'The request is not confirmed yet. Check your connection and retry, or refresh its status.')
  return response.json()
}
let widgetScript: Promise<void> | undefined
function loadWidget() {
  if (window.turnstile) return Promise.resolve()
  if (!widgetScript) widgetScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => { widgetScript = undefined; script.remove(); reject(new Error('Verification could not load. Refresh to try again.')) }
    document.head.appendChild(script)
  })
  return widgetScript
}
function Captcha({ siteKey, attemptId, reset, onToken, onError }: { siteKey: string; attemptId: string; reset: number; onToken: (value: string) => void; onError: (value: string) => void }) {
  const node = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let active = true, id: string | undefined
    void loadWidget().then(() => {
      if (!active || !node.current || !window.turnstile) return
      id = window.turnstile.render(node.current, { sitekey: siteKey, action: 'contact_join', cData: attemptId, size: matchMedia('(max-width: 400px)').matches ? 'compact' : 'normal',
        callback: (token: string) => { if (active) onToken(token) }, 'expired-callback': () => onToken(''),
        'error-callback': () => { onToken(''); onError('Verification could not load. Refresh to try again.') } })
    }).catch(error => { if (active) onError(error.message) })
    return () => { active = false; if (id && window.turnstile) window.turnstile.remove(id) }
  }, [siteKey, attemptId, reset, onToken, onError])
  return <div className="enrollment-captcha" ref={node} aria-label="Verification challenge" />
}

export function EnrollmentPage() {
  const path = enrollmentPath(window.location.pathname)
  const [view, setView] = useState<View>('loading')
  const [sender, setSender] = useState('your trusted person')
  const [siteKey, setSiteKey] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [attemptId, setAttemptId] = useState(() => {
    const saved = new URLSearchParams(location.hash.slice(1)).get('attemptId')
    if (saved && uuidPattern.test(saved)) return saved
    return crypto.randomUUID()
  })
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [consent, setConsent] = useState(false)
  const [captcha, setCaptcha] = useState(''), [resetCaptcha, setResetCaptcha] = useState(0)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirmWithdrawal, setConfirmWithdrawal] = useState(false)
  const managementToken = path?.management ? path.token : session?.withdrawalToken
  function recoveryFragment(value: Partial<Session>) {
    // Fragments never travel in HTTP requests. Keep this page URL private;
    // the independent email management link remains available after tab close.
    const fragment = new URLSearchParams(value as Record<string,string>).toString()
    history.replaceState(null, '', `${location.pathname}#${fragment}`)
  }
  function save(value: Session) { setSession(value); recoveryFragment(value) }
  async function refresh(token = managementToken) {
    if (!token) return
    const result = await call(token)
    if (!['pending_email','pending_approval','approved','withdrawal_pending','withdrawn','expired'].includes(result.status)) throw new Error('Status is temporarily unavailable.')
    setView(result.status === 'pending_email' ? 'code' : result.status)
    if (['approved','withdrawn','expired'].includes(result.status)) { setCode(''); setEmail('') }
  }
  useEffect(() => {
    let active = true
    void (async () => {
      if (!path) { setView('unavailable'); return }
      if (path.management) { try { await refresh(path.token) } catch { if (active) setView('unavailable') } return }
      const fields = new URLSearchParams(location.hash.slice(1))
      const cached = parseEnrollmentSession({ attemptId: fields.get('attemptId'), withdrawalToken: fields.get('withdrawalToken'), expiresAt: fields.get('expiresAt') })
      if (cached) {
        if (!active) return
        setSession(cached)
        try { await refresh(cached.withdrawalToken); return } catch { /* Try the read-only invitation. */ }
      }
      try {
        const [preview, configuration] = await Promise.all([call(path.token), call('config')])
        if (!active) return
        if (typeof preview.displayName !== 'string' || preview.consentVersion !== '2026-10-19'
          || typeof configuration.siteKey !== 'string') throw new Error('This invitation is unavailable.')
        setSender(preview.displayName); setSiteKey(configuration.siteKey); setView('ready')
      } catch { if (active) setView('unavailable') }
    })()
    return () => { active = false }
  // Path is fixed for this page load; GETs never mutate consent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  async function begin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!path || path.management || !invitePattern.test(path.token) || busy) return
    setBusy(true); setError('')
    recoveryFragment({ attemptId })
    try {
      const result = parseEnrollmentSession(await call(path.token, 'begin', { attemptId, email, consent, consentVersion: '2026-10-19', captchaToken: captcha, intent: 'join' }))
      if (!result) throw new Error('The request is not confirmed yet. Retry the same request.')
      save(result); setEmail(''); setView('code')
    } catch (caught) { setError((caught as Error).message) }
    finally { setBusy(false); setCaptcha(''); setResetCaptcha(value => value + 1) }
  }
  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!path || !session || busy) return
    setBusy(true); setError('')
    try { await call(path.token, 'verify', { attemptId: session.attemptId, code }); setCode(''); await refresh() }
    catch (caught) { setError((caught as Error).message); try { await refresh() } catch { /* Preserve code form for safe retry. */ } }
    finally { setBusy(false) }
  }
  async function withdraw() {
    if (!managementToken || busy) return
    setBusy(true); setError('')
    try { await call(managementToken, 'withdraw', {}); setView('withdrawn'); setConfirmWithdrawal(false); setCode(''); setEmail('') }
    catch (caught) { setError((caught as Error).message) }
    finally { setBusy(false) }
  }
  async function requestNewCode() {
    if (!path || path.management || busy) return
    setBusy(true); setError('')
    try {
      const [preview, config] = await Promise.all([call(path.token), call('config')])
      if (preview.consentVersion !== '2026-10-19' || typeof preview.displayName !== 'string' || typeof config.siteKey !== 'string') throw new Error('Ask the sender for a new invitation.')
      const next = crypto.randomUUID()
      setAttemptId(next); setSession(null); setSender(preview.displayName); setSiteKey(config.siteKey); setCaptcha(''); setConsent(false); setResetCaptcha(value=>value+1)
      recoveryFragment({ attemptId: next })
      setView('ready')
    } catch { setError('This invitation may have closed. Ask the sender for a new invitation.') }
    finally { setBusy(false) }
  }
  return <main className="viewer-shell enrollment-shell"><section className="card enrollment-card" aria-live="polite">
    <a className="enrollment-brand" href="/">SignalWord</a><p className="eyebrow">Your choice. Your trusted connection.</p>
    {view === 'loading' ? <h1>Checking this private link…</h1> : view === 'ready' ? <>
      <h1>Be there for {sender}.</h1><p>Become their trusted contact. Enter your own email; no app or account is needed.</p>
      <form onSubmit={begin}><label htmlFor="join-email">Your email</label><input id="join-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} required disabled={busy}/>
        <label className="enrollment-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required disabled={busy}/><span>I agree to receive this person’s TEST and REAL safety alert emails, which may include their location snapshot. My email will be used for this connection; the sender can review an email hint and must approve me. I can withdraw consent at any time.</span></label>
        {siteKey && <Captcha siteKey={siteKey} attemptId={attemptId} reset={resetCaptcha} onToken={setCaptcha} onError={setError}/>}
        <button className="primary-button" disabled={busy || !captcha || !consent}>{busy ? 'Requesting…' : 'Email my verification code'}</button></form>
    </> : view === 'code' ? <><h1>{path?.management ? 'Your email is not verified yet' : 'Check your email'}</h1><p>Use the six-digit code in the email. It expires after ten minutes. No alerts are enabled until you verify and the sender approves.</p>
      {session && !path?.management && <form onSubmit={verify}><label htmlFor="join-code">Verification code</label><input id="join-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required disabled={busy}/><button className="primary-button" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify my email'}</button></form>}
      <p>Keep the email. Its private management link lets you cancel or withdraw later. Do not share this page URL.</p>
    </> : view === 'pending_approval' ? <><h1>Your email is verified</h1><p>The sender still needs to approve you in SignalWord. Alerts are not enabled for this connection yet.</p><p>Ask them to review your request. Keep the private management link in your email.</p></>
      : view === 'approved' ? <><h1>Your connection is confirmed</h1><p>You can now receive this person’s TEST and REAL alerts. Arrange a TEST rehearsal together before relying on your setup.</p></>
        : view === 'withdrawal_pending' ? <><h1>Withdrawal is not confirmed yet</h1><p>We haven’t confirmed that your privacy change has been saved. Retry withdrawal to confirm its completion.</p><button disabled={busy} onClick={() => void withdraw()}>{busy ? 'Saving withdrawal…' : 'Retry withdrawal'}</button></>
        : view === 'withdrawn' ? <><h1>Consent withdrawn</h1><p>Future and unclaimed messages are stopped. Email already submitted to the provider cannot be retracted.</p></>
          : view === 'expired' ? <><h1>This request is closed</h1><p>It may have expired, been cancelled or been replaced. Ask the sender for a new invitation if you still want to connect.</p></>
            : <><h1>This link is unavailable</h1><p>It may be expired or this feature may not be ready. Check your connection and try again later.</p><button onClick={() => location.reload()}>Try again</button></>}
    {error && <p className="enrollment-error" role="alert">{error}</p>}
    {managementToken && !['loading','withdrawal_pending','withdrawn','unavailable','expired'].includes(view) && <div className="enrollment-actions">
      <button disabled={busy} onClick={() => { setError(''); void refresh().catch(() => setError('Status is not confirmed yet. Try refreshing again.')) }}>Refresh status</button>
      {!confirmWithdrawal ? <button disabled={busy} onClick={() => setConfirmWithdrawal(true)}>{view === 'approved' ? 'Withdraw consent' : 'Cancel this request'}</button>
        : <><p>This stops this connection. It cannot retract email already sent.</p><button disabled={busy} onClick={() => void withdraw()}>{busy ? 'Saving withdrawal…' : 'Confirm withdrawal'}</button><button disabled={busy} onClick={() => setConfirmWithdrawal(false)}>Keep connection</button></>}
    </div>}
    {['code','expired'].includes(view) && !path?.management && <button disabled={busy} onClick={() => void requestNewCode()}>Request a new code</button>}
    <p className="enrollment-note">SignalWord does not contact emergency services or guarantee delivery or help. Only connect with someone you recognise.</p>
    <nav aria-label="Information"><a href="/privacy">Privacy</a><a href="/support">Support</a></nav>
  </section></main>
}
