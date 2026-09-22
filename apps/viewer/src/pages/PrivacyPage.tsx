export function PrivacyPage() {
  return (
    <main className="information-shell">
      <header className="information-header">
        <a href="/" className="wordmark">SignalWord</a>
        <a href="/support">Support</a>
      </header>
      <article className="information-content">
        <div className="information-intro">
          <p className="eyebrow">Privacy</p>
        <h1>Your private phrase stays with iOS.</h1>
        <p className="lede">SignalWord is designed to notify one confirmed trusted contact. It is not an emergency-dispatch service.</p>
        </div>

        <section className="information-section">
          <h2>What SignalWord does not collect</h2>
          <p>SignalWord does not receive, store, log, or upload your Vocal Shortcut phrase, its audio, or ordinary ambient audio.</p>
        </section>
        <section className="information-section">
          <h2>What an alert can include</h2>
          <p>After an alert, SignalWord may process your chosen display name, encrypted trusted-contact destination, alert status, and the latest available location with its timestamp and accuracy.</p>
        </section>
        <section className="information-section">
          <h2>Retention</h2>
          <p>Location samples are scheduled for deletion 24 hours after resolution or expiry. Redacted delivery diagnostics are retained for no more than seven days.</p>
        </section>
        <section className="information-section">
          <h2>Links and recipients</h2>
          <p>A contact viewer link is high-entropy, time-limited, and revocable. It is scoped to one event. SignalWord does not automatically contact police or emergency services.</p>
        </section>
        <section className="information-section information-section-emphasis">
          <h2>Delete your data</h2>
          <p>When the in-app deletion flow is available, it revokes viewer links, removes server data, clears local storage, and signs out the device identity. Until then, do not rely on this page as a deletion request mechanism.</p>
        </section>
      </article>
    </main>
  )
}
