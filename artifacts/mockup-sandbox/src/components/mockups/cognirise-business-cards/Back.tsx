import "./_business-card.css";

export default function Back() {
  return (
    <section className="cogni-card bc-back" aria-label="Cognirise business card reverse">
      <div className="bc-safe">
        <img className="bc-logo" src="/__mockup/images/cognirise/logo-white.svg" alt="Cognirise" />
        <p className="bc-brandline">Make intelligence<br />move with purpose.</p>
        <div className="bc-back-footer">
          <span>Strategy · Data · AI</span>
          <span>cognirise.com</span>
        </div>
      </div>
      <div className="bc-rail" />
    </section>
  );
}