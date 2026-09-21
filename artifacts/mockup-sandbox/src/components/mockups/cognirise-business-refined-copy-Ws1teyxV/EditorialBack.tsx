import "./_editorial.css";

export function EditorialBack() {
  return (
    <section className="cognirise-editorial-card editorial-back" aria-label="Cognirise employee business card reverse">
      <div className="editorial-back__signal" aria-hidden="true" />
      <div className="cognirise-editorial-card__safe editorial-back__safe">
        <div className="editorial-back__brand">
          <img
            className="editorial-back__logo"
            src="/__mockup/images/cognirise/logo-blue.svg"
            alt="Cognirise"
          />
          <div className="editorial-back__quiet-rule" aria-hidden="true" />
        </div>
        <div className="editorial-back__qr-panel">
          <div className="editorial-back__qr" aria-label="Reserved vCard QR code area">
            <div className="editorial-back__qr-inner">
              <strong>QR</strong>
              <span>Reserved area</span>
            </div>
          </div>
        </div>
        <div className="editorial-back__footer">
          <p className="editorial-back__label">Save contact</p>
          <p className="editorial-back__qr-caption">vCard QR placeholder<br />to be generated</p>
        </div>
      </div>
    </section>
  );
}

export default EditorialBack;