import "./signature-front.css";

export function SignatureFront() {
  return (
    <section className="quiet-signature-card" aria-label="Cognirise employee business card front">
      <div className="quiet-signature-card__signal" aria-hidden="true" />
      <div className="quiet-signature-card__brand">
        <img
          className="quiet-signature-card__logo"
          src="/__mockup/images/cognirise/logo-white.svg"
          alt="Cognirise"
        />
      </div>

      <div className="quiet-signature-card__identity">
        <h1>Mounir Ariss</h1>
        <p>CEO &amp; Co-founder</p>
      </div>

      <div className="quiet-signature-card__contacts" aria-label="Contact details">
        <span>mounir@cognirise.ai</span>
        <span>+971 (50) 650 4416</span>
        <span>+ 966 (50) 876 0 874</span>
      </div>

      <div className="quiet-signature-card__site">cognirise.ai</div>
    </section>
  );
}

export default SignatureFront;