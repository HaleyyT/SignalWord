export function SupportPage() {
  return (
    <main className="information-shell">
      <header className="information-header">
        <a href="/" className="wordmark">SignalWord</a>
        <a href="/privacy">Privacy</a>
      </header>
      <article className="information-content">
        <p className="eyebrow">Support</p>
        <h1>Use a safe route to get help.</h1>
        <p className="lede">SignalWord helps notify a trusted contact. It does not dispatch emergency services or guarantee delivery.</p>

        <section>
          <h2>If you believe someone is in immediate danger</h2>
          <p>Contact the appropriate local emergency service. Do not wait for an alert link or location update.</p>
        </section>
        <section>
          <h2>Before relying on SignalWord</h2>
          <p>Complete the two locked-device tests, confirm your trusted contact, and verify the readiness screen. Delivery requires a network connection and can fail.</p>
        </section>
        <section>
          <h2>Report a product problem</h2>
          <p>For non-urgent product support, open a GitHub issue without including phrases, contact destinations, viewer links, tokens, precise coordinates, or account credentials.</p>
          <a href="https://github.com/HaleyyT/SignalWord/issues/new" rel="noreferrer" target="_blank">Open the SignalWord issue tracker</a>
        </section>
        <section>
          <h2>Report a security concern</h2>
          <p>Do not publish suspected data exposure or credentials in an issue. Follow the private reporting guidance in the project security policy.</p>
          <a href="https://github.com/HaleyyT/SignalWord/blob/main/SECURITY.md" rel="noreferrer" target="_blank">Read the security policy</a>
        </section>
      </article>
    </main>
  )
}
