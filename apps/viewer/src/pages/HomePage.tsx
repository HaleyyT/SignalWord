import './home.css'

/** Public information only: visiting home never reads or mutates an alert. */
export function HomePage() {
  return (
    <div className="home-page">
      <a className="home-skip" href="#main">Skip to content</a>
      <header className="home-header home-wrap">
        <a className="wordmark" href="/" aria-label="SignalWord home">SignalWord</a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="/support">Support</a>
        </nav>
      </header>
      <main id="main">
        <section className="home-hero home-wrap" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <p className="eyebrow">A connection you choose</p>
            <h1 id="home-title">Reach someone<br />you trust.</h1>
            <p className="home-lede">An iPhone safety app designed to help you alert one trusted person when you need their attention.</p>
            <a className="home-button" href="#how-it-works">How it works <span aria-hidden="true">↗</span></a>
          </div>
          <figure className="home-photo">
            <img src="/images/trusted-connection.webp" width="1024" height="1280" fetchPriority="high" alt="Two friends walking together beside the sea at dusk." />
          </figure>
        </section>

        <aside className="home-status home-wrap" aria-label="Availability">
          <strong>Currently in development</strong>
          <p>We’re testing an invitation-only email experience. Public enrollment is not open. Do not rely on this development version in an emergency.</p>
        </aside>

        <section className="home-section home-wrap" id="how-it-works" aria-labelledby="how-title">
          <h2 id="how-title">Make the first alert a rehearsal.</h2>
          <ol className="home-steps">
            <li><h3>Choose your person</h3><p>Invite one trusted contact. They confirm by email before receiving your alerts, and can withdraw consent.</p></li>
            <li><h3>Practise together</h3><p>Send a clearly labelled TEST. Your contact opens the private link and acknowledges it so you can practise the full journey.</p></li>
            <li><h3>Know what happened</h3><p>Follow alert progress in the app. An acknowledgment means someone used the recipient link. It does not mean help is coming.</p></li>
          </ol>
        </section>

        <section className="home-recipient home-wrap" aria-labelledby="recipient-title">
          <div><p className="eyebrow">For trusted contacts</p><h2 id="recipient-title">Received a SignalWord email?</h2></div>
          <div><p>Open the private link in that email to confirm an invitation or view an alert. You don’t need a SignalWord account.</p>
            <p>Keep the link private. If you receive an unexpected message, contact the sender directly before taking action.</p>
            <a className="action-link" href="/support">Support <span aria-hidden="true"> ↗</span></a>
          </div>
        </section>

        <section className="home-section home-wrap home-faq" aria-labelledby="questions-title">
          <h2 id="questions-title">A few things to know.</h2>
          <details><summary>How do I trigger an alert?</summary><p>The iPhone app includes a manual alert action. You can also configure separate TEST and REAL Vocal Shortcuts in iOS. Practise on your own device before use; locked-device behavior still needs release validation.</p></details>
          <details><summary>Does SignalWord contact emergency services?</summary><p>No. It notifies your confirmed trusted contact. It does not dispatch police, ambulance or other emergency services. If someone may be in immediate danger, contact local emergency services directly.</p></details>
          <details><summary>Is email delivery guaranteed?</summary><p>No. A network connection and working delivery services are required. Provider acceptance, delivery reports and recipient acknowledgment are separate states. A delivered email does not prove that someone read it.</p></details>
          <details><summary>What about location and privacy?</summary><p>Location is optional. If available, the recipient view shows its age and accuracy. Access uses a private link, so anyone with that link may be able to view it. Read our <a href="/privacy">Privacy</a> page for the data lifecycle and limitations.</p></details>
          <details><summary>Can I download the app now?</summary><p>Public enrollment is not open. Device testing, operational checks and pilot evidence are still being completed. For non-urgent product questions, email <a href="mailto:support@signalword.app">support@signalword.app</a>. Please don’t include private alert links, passwords or precise locations.</p></details>
        </section>
      </main>
      <footer className="home-footer home-wrap">
        <a className="wordmark" href="/">SignalWord</a>
        <p>A little preparation. A person you trust.</p>
        <nav aria-label="Footer navigation"><a href="/privacy">Privacy</a><a href="/support">Support</a></nav>
      </footer>
    </div>
  )
}
