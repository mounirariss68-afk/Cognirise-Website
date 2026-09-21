import "./_signature.css";

export function SignatureFront() {
  return (
    <section className="cognirise-signature-card signature-front" aria-label="Cognirise employee business card front">
      <div className="signature-front__brand">
        <img
          className="signature-front__logo"
          src="/__mockup/images/cognirise/logo-white.svg"
          alt="Cognirise"
        />
      </div>

      <div className="signature-front__identity">
        <h1 className="signature-front__name">Your Name</h1>
        <p className="signature-front__role">Position / Department</p>
      </div>

      <div className="signature-front__contacts" aria-label="Contact details">
        <span>name@example.com</span>
        <span>+971 XX XXX XXXX</span>
      </div>
    </section>
  );
}

export default SignatureFront;