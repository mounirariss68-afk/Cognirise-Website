import "./_column.css";

export function ColumnFront() {
  return (
    <article className="ariss-column-card ariss-column-front" aria-label="Cognirise business card front for Mounir Ariss">
      <section className="ariss-column-brand" aria-label="Cognirise brand">
        <img
          className="ariss-column-logo"
          src="/__mockup/images/cognirise/logo-white.svg"
          alt="Cognirise"
        />
      </section>
      <section className="ariss-column-details">
        <h1 className="ariss-column-name">Mounir Ariss</h1>
        <p className="ariss-column-title">CEO &amp; Co-founder</p>
        <div className="ariss-column-rule" />
        <div className="ariss-column-contact" aria-label="Contact information">
          <div className="ariss-column-phone">+971 (50) 650 4416</div>
          <div className="ariss-column-phone">+ 966 (50) 876 0 874</div>
        </div>
        <div className="ariss-column-site">cognirise.ai</div>
      </section>
    </article>
  );
}

export default ColumnFront;