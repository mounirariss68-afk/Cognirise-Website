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
          <p className="ariss-column-back-site">cognirise.ai</p>
          <div className="ariss-column-back-rail" aria-hidden="true"><i /><i /><i /></div>
        </div>
      </section>
      <section className="ariss-column-qr-side">
        <div className="ariss-column-qr-row">
          <div className="ariss-column-qr-placeholder" aria-label="240 pixel square vCard QR placeholder">
            QR
          </div>
        </div>
      </section>
    </article>
  );
}

export default ColumnBack;