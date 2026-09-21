import "./_business-card.css";

export default function Back() {
  return (
    <section className="cogni-card bc-back-quiet" aria-label="Cognirise business card reverse with vCard QR placement">
      <div className="bcq-rule bcq-rule-top" />
      <div className="bcq-rule bcq-rule-bottom" />
      <div className="bcq-rail" />
      <div className="bcq-safe">
        <div className="bcq-brand">
          <img src="/__mockup/images/cognirise/logo-blue.svg" alt="Cognirise" />
          <p>Intelligence, made useful.</p>
        </div>
        <div className="bcq-statement">
          <span>Strategy</span>
          <span>Data</span>
          <span>AI</span>
        </div>
        <div className="bcq-vcard">
          <div className="bcq-qr" aria-label="Reserved vCard QR code placeholder">
            <div className="bcq-qr-inner">
              <strong>QR</strong>
              <span>vCard code<br />to be generated</span>
            </div>
          </div>
          <div className="bcq-vcard-copy">
            <strong>Employee vCard</strong>
            <span>Reserved 22 mm code area<br />after contact approval</span>
          </div>
        </div>
      </div>
    </section>
  );
}