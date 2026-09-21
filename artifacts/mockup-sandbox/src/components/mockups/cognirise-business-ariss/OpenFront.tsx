import "./_open.css";

export function OpenFront() {
  return (
    <section className="cognirise-open-card cognirise-open-front" aria-label="Cognirise business card front for Mounir Ariss">
      <div className="cognirise-open-card__safe cognirise-open-front__safe">
        <div className="cognirise-open-front__brand">
          <img
            className="cognirise-open-front__logo"
            src="/__mockup/images/cognirise/logo-blue.svg"
            alt="Cognirise"
          />
          <div className="cognirise-open-front__signal" aria-hidden="true" />
        </div>

        <div className="cognirise-open-front__details">
          <h1 className="cognirise-open-front__name">Mounir Ariss</h1>
          <p className="cognirise-open-front__title">CEO &amp; Co-founder</p>

          <div className="cognirise-open-front__contact" aria-label="Phone contact details">
            <p>+971 (50) 650 4416</p>
            <p>+ 966 (50) 876 0 874</p>
            <p>mounir@cognirise.ai</p>
            <p>cognirise.ai</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default OpenFront;