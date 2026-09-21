import "./_business-card.css";

export default function Front() {
  return (
    <section className="cogni-card bc-front" aria-label="Cognirise employee business card front">
      <div className="bc-rule" />
      <div className="bc-signal" />
      <div className="bc-safe">
        <img className="bc-logo" src="/__mockup/images/cognirise/logo-blue.svg" alt="Cognirise" />
        <p className="bc-place">Dubai · UAE</p>
        <div className="bc-identity">
          <h1 className="bc-name">Your Name</h1>
          <p className="bc-title">Job Title</p>
        </div>
        <div className="bc-contact" aria-label="Contact details">
          <span>name@example.com</span>
          <span>+971 XX XXX XXXX</span>
          <span>cognirise.com</span>
        </div>
      </div>
    </section>
  );
}