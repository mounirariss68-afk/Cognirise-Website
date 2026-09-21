import "./FrontPolished.css";

export default function FrontPolished() {
  return (
    <main className="cogni-front-polished" aria-label="Cognirise refined business card front">
      <div className="fp-wash" aria-hidden="true" />
      <div className="fp-grid" aria-hidden="true" />
      <div className="fp-edge" aria-hidden="true" />

      <section className="fp-card">
        <header className="fp-header">
          <img className="fp-logo" src="/__mockup/images/cognirise/logo-blue.svg" alt="Cognirise" />
        </header>

        <div className="fp-rule" aria-hidden="true" />

        <div className="fp-content">
          <div className="fp-profile">
            <h1>Mounir Ariss</h1>
            <p className="fp-title">CEO &amp; Co-founder</p>
          </div>
        </div>

        <footer className="fp-footer">
          <div className="fp-contact" aria-label="Contact details">
            <a href="tel:+971506504416">+971 (50) 650 4416</a>
            <a href="tel:+966508760874">+ 966 (50) 876 0 874</a>
            <a href="mailto:mounir@cognirise.ai">mounir@cognirise.ai</a>
            <a href="https://cognirise.ai">cognirise.ai</a>
          </div>
        </footer>
      </section>
    </main>
  );
}