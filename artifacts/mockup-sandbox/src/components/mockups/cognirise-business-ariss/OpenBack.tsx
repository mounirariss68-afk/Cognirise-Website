import "./_open.css";

export function OpenBack() {
  return (
    <section className="cognirise-open-card cognirise-open-back" aria-label="Cognirise business card reverse with vCard QR reserve">
      <div className="cognirise-open-card__safe cognirise-open-back__safe">
        <div className="cognirise-open-back__topline">
          <img
            className="cognirise-open-back__logo"
            src="/__mockup/images/cognirise/logo-blue.svg"
            alt="Cognirise"
          />
          <p className="cognirise-open-back__web">cognirise.ai</p>
        </div>

        <div className="cognirise-open-back__qr-group">
          <div className="cognirise-open-back__qr" aria-label="240 pixel square reserved vCard QR placeholder">
            <div className="cognirise-open-back__qr-copy"><strong>QR</strong></div>
          </div>
        </div>

        <div className="cognirise-open-back__signature" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}

export default OpenBack;