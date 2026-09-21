import "./_column.css";

export function ColumnBack() {
  return (
    <article className="ariss-column-card ariss-column-back" aria-label="Cognirise business card reverse for Mounir Ariss">
      <section className="ariss-column-back-brand" aria-label="Cognirise brand">
        <img
          className="ariss-column-back-logo"
          src="/__mockup/images/cognirise/logo-white.svg"
          alt="Cognirise"
        />
        <div>
          <p className="ariss-column-back-site">cognirise.com</p>
          <div className="ariss-column-back-rail" aria-hidden="true"><i /><i /><i /></div>
        </div>
      </section>
      <section className="ariss-column-qr-side">
        <p className="ariss-column-qr-caption">Contact card</p>
        <div className="ariss-column-qr-row">
          <div className="ariss-column-qr-placeholder" aria-label="240 pixel square vCard QR placeholder">
            vCard QR<br />placeholder
          </div>
          <p className="ariss-column-qr-copy">Reserved for a 240px square vCard QR.</p>
        </div>
        <p className="ariss-column-back-name">Mounir Ariss · CEO &amp; Co-founder</p>
      </section>
    </article>
  );
}

export default ColumnBack;