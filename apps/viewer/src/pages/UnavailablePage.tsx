export function UnavailablePage() {
  return (
    <main className="information-shell">
      <article className="information-content">
        <p className="eyebrow">SignalWord</p>
        <h1>This page is unavailable.</h1>
        <p className="lede">Check the address or return to the information pages.</p>
        <p><a href="/privacy">Privacy</a> <span aria-hidden="true">/</span> <a href="/support">Support</a></p>
      </article>
    </main>
  )
}
